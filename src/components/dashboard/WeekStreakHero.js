import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { colors: themeColors } = useTheme();

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

  // Use streak color (rose/pink) for the flame - distinct from running amber
  const flameColor = weekStreak > 0 ? themeColors.streak : themeColors.text.tertiary;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.container, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: themeColors.streakDim }]}>
          <Flame
            size={32}
            color={flameColor}
            fill={weekStreak > 0 ? flameColor : 'transparent'}
            strokeWidth={2}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.streakNumber, { color: themeColors.text.primary }]}>
            {weekStreak} <Text style={[styles.streakLabel, { color: themeColors.text.secondary }]}>WEEK STREAK</Text>
          </Text>
          <Text style={[styles.lastWorkout, { color: themeColors.text.tertiary }]}>{getLastWorkoutText()}</Text>
        </View>
      </View>

      <View style={[styles.weekStripContainer, { borderTopColor: themeColors.surface.border }]}>
        <MiniWeekStrip workouts={currentWeekWorkouts} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  streakNumber: {
    ...TYPOGRAPHY.statMedium,
  },
  streakLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    fontWeight: '600',
  },
  lastWorkout: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  weekStripContainer: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
});
