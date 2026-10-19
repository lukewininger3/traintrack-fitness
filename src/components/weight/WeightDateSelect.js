import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Keyboard } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { formatDateForStorage } from '../../utils/dateFormatter';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

// iOS wheels drawn at 80% size
const WHEEL_HEIGHT = 180;
const WHEEL_SCALE = 0.8;
const STRIP_HEIGHT = 70;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Monday (noon, so DST shifts can't change the day) of the week containing `d`
const mondayOf = (d) => {
  const m = new Date(d);
  m.setHours(12, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
// 0 = this week, -1 = last week, ...
const weekIndexOf = (d) => Math.round((mondayOf(d) - mondayOf(new Date())) / WEEK_MS);

const weekLabel = (index) => {
  if (index === 0) return 'This week';
  if (index === -1) return 'Last week';
  const start = addDays(mondayOf(new Date()), index * 7);
  const end = addDays(start, 6);
  const sameYear = end.getFullYear() === new Date().getFullYear();
  const startText = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endText = start.getMonth() === end.getMonth()
    ? String(end.getDate())
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startText} – ${endText}${sameYear ? '' : `, ${end.getFullYear()}`}`;
};

/**
 * Date selector for logging a weigh-in: the date with a dropdown that opens
 * month/day/year wheels, a Monday–Sunday week strip marking which days are
 * logged (swipe right for earlier weeks, one week per swipe), and a line
 * saying whether the selected day already has a weigh-in.
 *
 * @param {object} props
 * @param {Date} props.date
 * @param {(date: Date) => void} props.onChange
 * @param {Array<{date: string, weight: number}>} props.entries all weigh-ins
 * @param {string} props.unit
 * @param {boolean} props.wheelsOpen
 * @param {(open: boolean) => void} props.onWheelsOpenChange
 * @param {object} props.colors
 * @param {boolean} props.isDark
 */
export default function WeightDateSelect({ date, onChange, entries, unit, wheelsOpen, onWheelsOpenChange, colors, isDark }) {
  const selectedKey = formatDateForStorage(date);
  const logged = new Map(entries.map(e => [e.date, e]));
  const selectedEntry = logged.get(selectedKey);

  const todayKey = formatDateForStorage(new Date());

  // Week shown in the strip; follows the selected date, and swiping moves it
  // one week at a time. Weeks sit side by side at fixed positions (week k at
  // k * width), so the row only slides and never jumps when weeks re-render.
  const [weekIndex, setWeekIndex] = useState(() => weekIndexOf(date));
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);
  const placedWidth = useRef(0);

  useEffect(() => {
    const index = weekIndexOf(date);
    setWeekIndex(index);
    if (placedWidth.current !== width) {
      // First layout (or a size change): place the row without animating
      placedWidth.current = width;
      offset.value = -index * width;
    } else {
      offset.value = withTiming(-index * width, { duration: 220 });
    }
  }, [selectedKey, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const settleOnWeek = (index) => {
    Haptics.selectionAsync();
    setWeekIndex(index);
  };

  const canGoForward = weekIndex < 0;
  const swipe = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate(e => {
      let t = e.translationX;
      if (t < 0 && !canGoForward) t *= 0.2; // resist: no future weeks
      t = Math.max(-width, Math.min(width, t));
      offset.value = -weekIndex * width + t;
    })
    .onEnd(e => {
      const t = e.translationX;
      const v = e.velocityX;
      let next = weekIndex;
      if (t > 0 && (t > width * 0.25 || v > 600)) next = weekIndex - 1;
      else if (t < 0 && canGoForward && (t < -width * 0.25 || v < -600)) next = weekIndex + 1;
      if (next === weekIndex) {
        offset.value = withSpring(-weekIndex * width, { damping: 20, stiffness: 240 });
      } else {
        offset.value = withTiming(-next * width, { duration: 220 });
        runOnJS(settleOnWeek)(next);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const weekDays = (index) => {
    const start = addDays(mondayOf(new Date()), index * 7);
    return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(start, i));
  };

  const pick = (d) => {
    const today = new Date();
    const next = d > today ? today : d;
    if (formatDateForStorage(next) === selectedKey) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  const toggleWheels = () => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    onWheelsOpenChange(!wheelsOpen);
  };

  return (
    <View>
      <Pressable
        onPress={toggleWheels}
        style={[styles.pill, { backgroundColor: colors.surface.card, borderColor: wheelsOpen ? colors.surface.borderAccent : colors.surface.border }]}
      >
        <Calendar size={15} color={colors.accent.primary} />
        <Text style={[styles.pillText, { color: colors.text.primary }]}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        {wheelsOpen
          ? <ChevronUp size={16} color={colors.text.tertiary} />
          : <ChevronDown size={16} color={colors.text.tertiary} />}
      </Pressable>

      {wheelsOpen && Platform.OS === 'ios' && (
        <View style={styles.wheelsFrame}>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(event, picked) => {
              if (event.type === 'set' && picked) pick(picked);
            }}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={colors.text.primary}
            style={styles.wheels}
          />
        </View>
      )}
      {wheelsOpen && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(event, picked) => {
            onWheelsOpenChange(false);
            if (event.type === 'set' && picked) pick(picked);
          }}
        />
      )}

      <Text style={[styles.weekLabel, { color: colors.text.tertiary }]}>
        {weekLabel(weekIndex).toUpperCase()}
        {weekIndex < 0 ? '' : '  ·  swipe for earlier weeks'}
      </Text>
      <GestureDetector gesture={swipe}>
        <View style={styles.strip} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Animated.View style={[StyleSheet.absoluteFill, rowStyle]}>
              {[weekIndex - 1, weekIndex, weekIndex + 1].filter(k => k <= 0).map(k => (
                <View key={k} style={[styles.week, { left: k * width, width }]}>
                  {weekDays(k).map(d => {
                    const key = formatDateForStorage(d);
                    const isSelected = key === selectedKey;
                    const isLogged = logged.has(key);
                    const isFuture = key > todayKey;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => pick(d)}
                        disabled={isFuture}
                        style={[
                          styles.day,
                          isFuture && styles.dayFuture,
                          { borderColor: isSelected ? colors.accent.primary : colors.surface.border },
                          isSelected && { backgroundColor: colors.accent.primaryDim },
                        ]}
                      >
                        <Text style={[styles.dayName, { color: isSelected ? colors.accent.primary : colors.text.tertiary }]}>
                          {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </Text>
                        <Text style={[styles.dayNumber, { color: isSelected ? colors.accent.primary : colors.text.primary }]}>
                          {d.getDate()}
                        </Text>
                        <View style={[styles.mark, { backgroundColor: isLogged ? colors.success : 'transparent', borderColor: isLogged ? colors.success : colors.surface.border }]}>
                          {isLogged && <Check size={9} color={colors.text.inverse} strokeWidth={4} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      <View style={styles.status}>
        {selectedEntry ? (
          <>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.text.secondary }]}>
              Already logged: {selectedEntry.weight.toFixed(1)} {unit} · saving will update it
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.statusDot, { borderWidth: 1.5, borderColor: colors.text.tertiary }]} />
            <Text style={[styles.statusText, { color: colors.text.tertiary }]}>Not logged yet</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  pillText: { ...TYPOGRAPHY.bodyBold },
  wheelsFrame: {
    height: WHEEL_HEIGHT * WHEEL_SCALE,
    marginTop: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wheels: { height: WHEEL_HEIGHT, width: '125%', transform: [{ scale: WHEEL_SCALE }] },
  weekLabel: { ...TYPOGRAPHY.label, fontSize: 10, marginTop: SPACING.md, marginBottom: SPACING.sm },
  strip: { height: STRIP_HEIGHT, overflow: 'hidden' },
  week: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: 3,
  },
  dayFuture: { opacity: 0.3 },
  dayName: { fontSize: 11, fontWeight: '700' },
  dayNumber: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...TYPOGRAPHY.caption },
});
