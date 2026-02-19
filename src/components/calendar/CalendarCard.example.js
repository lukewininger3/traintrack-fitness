/**
 * CalendarCard - Improved Version
 *
 * Key improvements:
 * 1. Clear visual hierarchy - month name is hero
 * 2. Stats moved to a subtle footer
 * 3. Reduced legend visual weight
 * 4. Better spacing rhythm
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATIONS } from '../../theme/design-v2';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CalendarCard({
  month,
  year,
  calendarData,
  weekStreak,
  stats,
  onDayPress,
  onPreviousMonth,
  onNextMonth,
}) {
  return (
    <View style={styles.container}>
      {/* Header - Clear hierarchy */}
      <View style={styles.header}>
        <IconButton onPress={onPreviousMonth} icon={ChevronLeft} />

        <View style={styles.headerCenter}>
          <Text style={styles.monthText}>{month}</Text>
          <Text style={styles.yearText}>{year}</Text>
        </View>

        <IconButton onPress={onNextMonth} icon={ChevronRight} />
      </View>

      {/* Week day labels */}
      <View style={styles.weekDays}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <Text key={idx} style={styles.weekDayLabel}>{day}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarData.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            {week.map((day, dayIdx) => (
              <DayCell
                key={dayIdx}
                day={day}
                onPress={() => day?.hasWorkout && onDayPress(day)}
              />
            ))}
            <WeekIndicator
              hasWorkout={week.some(d => d?.hasWorkout)}
              isCurrentWeek={week.some(d => d?.isToday)}
              streak={weekStreak}
            />
          </View>
        ))}
      </View>

      {/* Subtle divider */}
      <View style={styles.divider} />

      {/* Footer - Stats (subtle, secondary) */}
      <View style={styles.footer}>
        <View style={styles.statsGroup}>
          <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>workouts</Text>
        </View>

        {stats.change !== 0 && (
          <View style={[
            styles.changeBadge,
            stats.change > 0 ? styles.changeBadgePositive : styles.changeBadgeNegative
          ]}>
            <Text style={[
              styles.changeText,
              stats.change > 0 ? styles.changeTextPositive : styles.changeTextNegative
            ]}>
              {stats.change > 0 ? '+' : ''}{stats.change} vs last month
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Sub-components for cleaner code
function IconButton({ onPress, icon: Icon }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.9, ANIMATIONS.spring.stiff); }}
      onPressOut={() => { scale.value = withSpring(1, ANIMATIONS.spring.default); }}
      style={[styles.iconButton, animatedStyle]}
    >
      <Icon size={20} color={COLORS.text.primary} strokeWidth={2} />
    </AnimatedPressable>
  );
}

function DayCell({ day, onPress }) {
  if (!day) {
    return <View style={styles.dayCell} />;
  }

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (day.hasWorkout) {
      scale.value = withSpring(0.92, ANIMATIONS.spring.stiff);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring.default);
  };

  const workoutColor = day.workoutTypes?.[0]
    ? COLORS.workoutTypes[day.workoutTypes[0]]
    : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!day.hasWorkout}
      style={[styles.dayCell, animatedStyle]}
    >
      <View style={[
        styles.dayInner,
        day.isToday && styles.dayToday,
        day.hasWorkout && !day.isToday && {
          backgroundColor: workoutColor + '18',
          borderWidth: 1.5,
          borderColor: workoutColor + '40',
        },
      ]}>
        <Text style={[
          styles.dayText,
          day.isToday && styles.dayTextToday,
          day.hasWorkout && !day.isToday && { color: workoutColor },
          !day.hasWorkout && day.isFuture && styles.dayTextFuture,
        ]}>
          {day.day}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function WeekIndicator({ hasWorkout, isCurrentWeek, streak }) {
  if (isCurrentWeek && streak > 0) {
    return (
      <View style={styles.streakBadge}>
        <Flame size={12} color={COLORS.secondary.primary} strokeWidth={2.5} />
        <Text style={styles.streakText}>{streak}</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.weekDot,
      hasWorkout && styles.weekDotFilled,
    ]} />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  monthText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  yearText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week days header
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },

  // Calendar grid
  calendarGrid: {
    paddingHorizontal: SPACING.md,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  dayToday: {
    backgroundColor: COLORS.accent.primary,
  },
  dayText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  dayTextToday: {
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  dayTextFuture: {
    color: COLORS.text.disabled,
  },

  // Week indicator
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.surface.border,
    marginLeft: SPACING.sm,
  },
  weekDotFilled: {
    backgroundColor: COLORS.secondary.primary,
    borderColor: COLORS.secondary.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.secondary.dim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: SPACING.sm,
  },
  streakText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '700',
    color: COLORS.secondary.primary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.surface.divider,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.statSmall,
    color: COLORS.text.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  changeBadgePositive: {
    backgroundColor: COLORS.status.successDim,
  },
  changeBadgeNegative: {
    backgroundColor: COLORS.status.errorDim,
  },
  changeText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '600',
  },
  changeTextPositive: {
    color: COLORS.status.success,
  },
  changeTextNegative: {
    color: COLORS.status.error,
  },
});

export default CalendarCard;
