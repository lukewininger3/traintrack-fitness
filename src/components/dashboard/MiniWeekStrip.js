import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * MiniWeekStrip - Shows current week's workout completion as dots
 * @param {Array} workouts - Workouts filtered to current week
 * @param {Date} today - Current date
 */
export default function MiniWeekStrip({ workouts = [], today = new Date() }) {
  // Get start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Build array of days with workout status
  const weekDays = DAYS.map((label, index) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + index);

    const isToday = dayDate.toDateString() === today.toDateString();
    const isFuture = dayDate > today;

    // Find workout for this day
    const dayWorkout = workouts.find(w => {
      const workoutDate = new Date(w.date);
      return workoutDate.toDateString() === dayDate.toDateString();
    });

    return {
      label,
      isToday,
      isFuture,
      hasWorkout: !!dayWorkout,
      workoutType: dayWorkout?.type,
    };
  });

  return (
    <View style={styles.container}>
      {weekDays.map((day, index) => (
        <View key={index} style={styles.dayContainer}>
          <Text style={[
            styles.dayLabel,
            day.isToday && styles.dayLabelToday,
            day.isFuture && styles.dayLabelFuture,
          ]}>
            {day.label}
          </Text>
          <View style={[
            styles.dot,
            day.hasWorkout && styles.dotActive,
            day.hasWorkout && { backgroundColor: COLORS.workoutTypes[day.workoutType] || COLORS.accent.primary },
            day.isToday && !day.hasWorkout && styles.dotToday,
            day.isFuture && styles.dotFuture,
          ]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  dayContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dayLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: COLORS.text.primary,
  },
  dayLabelFuture: {
    color: COLORS.text.tertiary,
    opacity: 0.5,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  dotActive: {
    borderWidth: 0,
  },
  dotToday: {
    borderColor: COLORS.accent.primary,
    borderWidth: 2,
  },
  dotFuture: {
    opacity: 0.3,
  },
});
