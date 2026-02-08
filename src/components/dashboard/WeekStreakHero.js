import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';
import MiniWeekStrip from './MiniWeekStrip';

/**
 * WeekStreakHero - Hero display of week streak with mini week strip
 * @param {number} weekStreak - Current week streak count
 * @param {string} lastWorkoutDate - ISO date of last workout
 * @param {Array} currentWeekWorkouts - Workouts for current week
 */
export default function WeekStreakHero({
  weekStreak = 0,
  lastWorkoutDate,
  currentWeekWorkouts = [],
}) {
  const getLastWorkoutText = () => {
    if (!lastWorkoutDate) return 'No workouts yet';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = new Date(lastWorkoutDate);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Last workout: Today';
    if (diffDays === 1) return 'Last workout: Yesterday';
    return `Last workout: ${diffDays} days ago`;
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Flame
            size={32}
            color={weekStreak > 0 ? COLORS.secondary.primary : COLORS.text.tertiary}
            fill={weekStreak > 0 ? COLORS.secondary.primary : 'transparent'}
            strokeWidth={2}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.streakNumber}>
            {weekStreak} <Text style={styles.streakLabel}>WEEK STREAK</Text>
          </Text>
          <Text style={styles.lastWorkout}>{getLastWorkoutText()}</Text>
        </View>
      </View>

      <View style={styles.weekStripContainer}>
        <MiniWeekStrip workouts={currentWeekWorkouts} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary.dim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  streakNumber: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
  },
  streakLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  lastWorkout: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  weekStripContainer: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
});
