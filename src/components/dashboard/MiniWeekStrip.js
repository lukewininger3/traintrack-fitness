import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../theme/design';
import { useTheme } from '../../contexts/ThemeContext';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * MiniWeekStrip - Shows current week's workout completion as dots
 * @param {Array} workouts - Workouts filtered to current week
 * @param {Date} today - Current date
 */
export default function MiniWeekStrip({ workouts = [], today = new Date() }) {
  const { colors: themeColors } = useTheme();

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
      // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
      const workoutDate = new Date(w.date + 'T12:00:00');
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
            { color: themeColors.text.tertiary },
            day.isToday && { color: themeColors.text.primary },
            day.isFuture && { opacity: 0.5 },
          ]}>
            {day.label}
          </Text>
          <View style={[
            styles.dot,
            { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
            day.hasWorkout && { backgroundColor: themeColors.workoutTypes[day.workoutType] || themeColors.accent.primary, borderWidth: 0 },
            day.isToday && !day.hasWorkout && { borderColor: themeColors.accent.primary, borderWidth: 2 },
            day.isFuture && { opacity: 0.3 },
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
    fontWeight: '600',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
});
