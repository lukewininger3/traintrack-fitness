import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { TYPOGRAPHY, SPACING } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 140;
const STROKE_WIDTH = 7;
const RING_GAP = 10; // Gap between concentric rings
const CENTER = RING_SIZE / 2;

export default function WorkoutProgressRing({ plannedWorkouts = [] }) {
  const { colors: themeColors } = useTheme();

  // Group workouts by type and calculate completion
  const workoutsByType = plannedWorkouts.reduce((acc, workout) => {
    const type = workout.workoutType || 'Other';
    if (!acc[type]) {
      acc[type] = { total: 0, completed: 0, color: themeColors.workoutTypes[type] || themeColors.workoutTypes.Other };
    }
    acc[type].total++;
    if (workout.completed) acc[type].completed++;
    return acc;
  }, {});

  const types = Object.entries(workoutsByType);
  const totalWorkouts = plannedWorkouts.length;
  const completedWorkouts = plannedWorkouts.filter(w => w.completed).length;

  // Calculate the base radius for the outermost ring
  const baseRadius = (RING_SIZE - STROKE_WIDTH) / 2 - 4;

  // If no planned workouts, show empty state
  if (totalWorkouts === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={baseRadius}
              stroke={themeColors.surface.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
          </Svg>
          <View style={styles.centerContent}>
            <Text style={[styles.emptyText, { color: themeColors.text.tertiary }]}>No workouts</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>planned</Text>
          </View>
        </View>
      </View>
    );
  }

  // Create rings data - each type gets its own concentric ring
  const rings = types.map(([type, data], index) => {
    const radius = baseRadius - (index * RING_GAP);
    const circumference = 2 * Math.PI * radius;
    const completionRatio = data.total > 0 ? data.completed / data.total : 0;

    return {
      type,
      color: data.color,
      radius,
      circumference,
      completionRatio,
      total: data.total,
      completed: data.completed,
      index,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background rings */}
          {rings.map((ring) => (
            <Circle
              key={`bg-${ring.type}`}
              cx={CENTER}
              cy={CENTER}
              r={ring.radius}
              stroke={ring.color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              opacity={0.15}
            />
          ))}

          {/* Progress rings */}
          {rings.map((ring) => (
            <ProgressRing
              key={`progress-${ring.type}`}
              ring={ring}
            />
          ))}
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.completedCount, { color: themeColors.text.primary }]}>{completedWorkouts}</Text>
          <Text style={[styles.totalCount, { color: themeColors.text.tertiary }]}>/ {totalWorkouts}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {rings.map((ring) => (
          <View key={ring.type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
            <Text style={[styles.legendText, { color: themeColors.text.secondary }]}>{ring.type}</Text>
            <Text style={[styles.legendCount, { color: ring.color }]}>
              {ring.completed}/{ring.total}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProgressRing({ ring }) {
  const { radius, circumference, completionRatio, color, index } = ring;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withSpring(completionRatio, { damping: 15, stiffness: 80 })
    );
  }, [completionRatio]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <AnimatedCircle
      cx={CENTER}
      cy={CENTER}
      r={radius}
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      fill="none"
      strokeDasharray={circumference}
      strokeLinecap="round"
      rotation={-90}
      origin={`${CENTER}, ${CENTER}`}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCount: {
    ...TYPOGRAPHY.stat,
    fontSize: 32,
    lineHeight: 36,
  },
  totalCount: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    marginTop: -2,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyBold,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
  },
  legendCount: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
});
