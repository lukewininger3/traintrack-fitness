import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const PADDING = { top: 20, right: 44, bottom: 28, left: 4 };
const DAY_MS = 24 * 60 * 60 * 1000;
const SHOW_DOTS_MAX = 45;

/**
 * Smooth path through the points that never overshoots them
 * (monotone cubic interpolation), so the curve doesn't invent highs or lows.
 */
const smoothPath = (pts) => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  const n = pts.length;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push(dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i]);
  }

  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent.push(0);
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangent.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  tangent.push(slope[n - 2]);

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i].x + h},${pts[i].y + tangent[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - tangent[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
};

// Round grid steps (0.5, 1, 2, 2.5, 5, 10 ...) so axis labels are clean numbers
const niceStep = (span, maxTicks) => {
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  return steps.find(s => span / s <= maxTicks) || 100;
};

const formatAxisDate = (t, spanDays) => {
  const d = new Date(t);
  if (spanDays > 300) return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Lay out the points in pixels, plus the gridlines, axis labels and goal line.
 * `points` must be sorted oldest first: [{ t: ms, weight }]
 */
const buildLayout = (points, goalWeight, width, height) => {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const weights = points.map(p => p.weight);
  let lo = Math.min(...weights);
  let hi = Math.max(...weights);

  // Pull the goal into view when it's reasonably close, so the line shows how
  // far there is to go. A far-off goal would flatten the data, so it gets an
  // edge marker instead.
  const reach = Math.max((hi - lo) * 1.5, 5);
  const goalInView = goalWeight != null && goalWeight >= lo - reach && goalWeight <= hi + reach;
  if (goalInView) {
    lo = Math.min(lo, goalWeight);
    hi = Math.max(hi, goalWeight);
  }

  const pad = Math.max((hi - lo) * 0.12, 0.6);
  lo -= pad;
  hi += pad;
  const step = niceStep(hi - lo, 4);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Number(v.toFixed(2)));

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const tSpan = t1 - t0;

  const xFor = (t) => (tSpan === 0 ? PADDING.left + plotW / 2 : PADDING.left + ((t - t0) / tSpan) * plotW);
  const yFor = (w) => PADDING.top + (1 - (w - lo) / (hi - lo)) * plotH;

  const coords = points.map(p => ({ x: xFor(p.t), y: yFor(p.weight) }));
  const line = smoothPath(coords);
  const bottom = PADDING.top + plotH;
  const area = coords.length > 1
    ? `${line}L${coords[coords.length - 1].x},${bottom}L${coords[0].x},${bottom}Z`
    : '';

  // Rough length, used to "draw" the line in. Padded because curves run a bit
  // longer than the straight segments between their points.
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    length += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
  }

  const spanDays = tSpan / DAY_MS;
  const xLabels = tSpan === 0
    ? [{ x: xFor(t0), text: formatAxisDate(t0, 0), anchor: 'middle' }]
    : [
      { x: PADDING.left, text: formatAxisDate(t0, spanDays), anchor: 'start' },
      { x: PADDING.left + plotW / 2, text: formatAxisDate(t0 + tSpan / 2, spanDays), anchor: 'middle' },
      { x: PADDING.left + plotW, text: formatAxisDate(t1, spanDays), anchor: 'end' },
    ];

  let goal = null;
  if (goalWeight != null) {
    goal = goalInView
      ? { y: yFor(goalWeight), inView: true }
      : { y: goalWeight > hi ? PADDING.top : bottom, inView: false, above: goalWeight > hi };
  }

  return {
    coords,
    line,
    area,
    length: length * 1.3 + 20,
    bottom,
    plotRight: PADDING.left + plotW,
    yTicks: ticks.map(v => ({ v, y: yFor(v) })),
    xLabels,
    goal,
  };
};

/** Everything that doesn't move while scrubbing; memoized so dragging only redraws the cursor. */
const ChartBody = memo(function ChartBody({ layout, width, height, colors, goalWeight, unit, animationKey }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
  }, [animationKey, progress]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: layout.length * (1 - progress.value),
  }));
  const areaProps = useAnimatedProps(() => ({
    fillOpacity: progress.value,
  }));

  const { coords } = layout;
  const last = coords[coords.length - 1];
  const showDots = coords.length <= SHOW_DOTS_MAX;
  const accent = colors.accent.primary;
  const goalColor = colors.tertiary.primary;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
          <Stop offset="0.7" stopColor={accent} stopOpacity={0.06} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {layout.yTicks.map(tick => (
        <React.Fragment key={tick.v}>
          <Line
            x1={PADDING.left}
            x2={layout.plotRight}
            y1={tick.y}
            y2={tick.y}
            stroke={colors.surface.divider}
            strokeWidth={1}
          />
          <SvgText
            x={width - 2}
            y={tick.y + 4}
            fontSize={11}
            fontWeight="500"
            fill={colors.text.tertiary}
            textAnchor="end"
          >
            {Number.isInteger(tick.v) ? tick.v : tick.v.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      {layout.xLabels.map(label => (
        <SvgText
          key={`${label.anchor}-${label.text}`}
          x={label.x}
          y={height - 8}
          fontSize={11}
          fontWeight="500"
          fill={colors.text.tertiary}
          textAnchor={label.anchor}
        >
          {label.text}
        </SvgText>
      ))}

      {layout.goal && (
        layout.goal.inView ? (
          <>
            <Line
              x1={PADDING.left}
              x2={layout.plotRight}
              y1={layout.goal.y}
              y2={layout.goal.y}
              stroke={goalColor}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <Rect
              x={PADDING.left}
              y={layout.goal.y - 18}
              width={88}
              height={15}
              rx={4}
              fill={colors.background.primary}
              fillOpacity={0.75}
            />
            <SvgText x={PADDING.left + 4} y={layout.goal.y - 6} fontSize={11} fontWeight="700" fill={goalColor}>
              {`GOAL ${goalWeight} ${unit}`}
            </SvgText>
          </>
        ) : (
          <SvgText
            x={PADDING.left + 4}
            y={layout.goal.above ? layout.goal.y - 6 : layout.goal.y + 14}
            fontSize={11}
            fontWeight="700"
            fill={goalColor}
          >
            {`GOAL ${goalWeight} ${unit} ${layout.goal.above ? '↑' : '↓'}`}
          </SvgText>
        )
      )}

      {layout.area !== '' && (
        <AnimatedPath d={layout.area} fill="url(#weightFill)" animatedProps={areaProps} />
      )}
      {coords.length > 1 && (
        <AnimatedPath
          d={layout.line}
          stroke={accent}
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={[layout.length, layout.length]}
          animatedProps={lineProps}
        />
      )}

      {showDots && coords.slice(0, -1).map((c, i) => (
        <Circle key={i} cx={c.x} cy={c.y} r={2.75} fill={colors.background.primary} stroke={accent} strokeWidth={1.75} />
      ))}

      {/* Latest weigh-in */}
      <Circle cx={last.x} cy={last.y} r={9} fill={accent} fillOpacity={0.18} />
      <Circle cx={last.x} cy={last.y} r={4.5} fill={accent} stroke={colors.background.primary} strokeWidth={2} />
    </Svg>
  );
});

/**
 * Interactive weight chart. Drag (or press and hold, then drag) to scrub
 * through weigh-ins; tap a point to select it.
 *
 * @param {object} props
 * @param {Array<{t: number, weight: number}>} props.points sorted oldest first
 * @param {number|null} props.goalWeight
 * @param {number} props.width
 * @param {number} props.height
 * @param {object} props.colors theme colors
 * @param {string} props.unit
 * @param {string} props.animationKey changes when the line should draw in again
 * @param {(index: number) => void} props.onSelect index into points, or -1 when cleared
 */
export default function WeightChart({ points, goalWeight, width, height, colors, unit, animationKey, onSelect }) {
  const layout = useMemo(
    () => (points.length > 0 && width > 0 ? buildLayout(points, goalWeight, width, height) : null),
    [points, goalWeight, width, height]
  );

  const [selected, setSelected] = useState(-1);
  const stickyRef = useRef(false);
  const xs = useSharedValue([]);
  const active = useSharedValue(-1);

  useEffect(() => {
    xs.value = layout ? layout.coords.map(c => c.x) : [];
    active.value = -1;
    setSelected(-1);
    stickyRef.current = false;
  }, [layout, xs, active]);

  const handleIndex = useCallback((index, fromTap) => {
    if (fromTap) {
      // Tapping the selected point again clears it
      if (stickyRef.current && index === selected) {
        stickyRef.current = false;
        setSelected(-1);
        onSelect?.(-1);
        return;
      }
      stickyRef.current = true;
    } else if (index === -1 && stickyRef.current) {
      return;
    } else {
      stickyRef.current = false;
    }
    if (index >= 0) Haptics.selectionAsync();
    setSelected(index);
    onSelect?.(index);
  }, [onSelect, selected]);

  const nearest = (x) => {
    'worklet';
    const arr = xs.value;
    if (arr.length === 0) return -1;
    let low = 0;
    let high = arr.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (arr[mid] < x) low = mid; else high = mid;
    }
    return Math.abs(arr[low] - x) <= Math.abs(arr[high] - x) ? low : high;
  };

  const track = (x) => {
    'worklet';
    const i = nearest(x);
    if (i !== active.value) {
      active.value = i;
      runOnJS(handleIndex)(i, false);
    }
  };

  const release = () => {
    'worklet';
    active.value = -1;
    runOnJS(handleIndex)(-1, false);
  };

  // Horizontal drag scrubs right away; vertical drags fall through to the
  // page scroll. Press-and-hold also starts scrubbing.
  const drag = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(e => track(e.x))
    .onUpdate(e => track(e.x))
    .onFinalize(() => { if (active.value !== -1) release(); });
  const hold = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(e => track(e.x))
    .onUpdate(e => track(e.x))
    .onFinalize(() => { if (active.value !== -1) release(); });
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, success) => {
      if (!success) return;
      const i = nearest(e.x);
      runOnJS(handleIndex)(i, true);
    });
  const gesture = Gesture.Race(drag, hold, tap);

  if (!layout) return <View style={{ width, height }} />;

  const point = selected >= 0 ? layout.coords[selected] : null;

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} collapsable={false}>
        <ChartBody
          layout={layout}
          width={width}
          height={height}
          colors={colors}
          goalWeight={goalWeight}
          unit={unit}
          animationKey={animationKey}
        />
        {point && (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={point.x}
              x2={point.x}
              y1={PADDING.top - 8}
              y2={layout.bottom}
              stroke={colors.text.secondary}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Circle cx={point.x} cy={point.y} r={12} fill={colors.accent.primary} fillOpacity={0.22} />
            <Circle cx={point.x} cy={point.y} r={6} fill={colors.accent.primary} stroke={colors.background.primary} strokeWidth={2.5} />
          </Svg>
        )}
      </View>
    </GestureDetector>
  );
}
