import { Check, Plus, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

// Reorder days to start with Monday
const WEEK_DAYS = [
  { short: 'M', full: 'Mon', index: 1 },
  { short: 'T', full: 'Tue', index: 2 },
  { short: 'W', full: 'Wed', index: 3 },
  { short: 'T', full: 'Thu', index: 4 },
  { short: 'F', full: 'Fri', index: 5 },
  { short: 'S', full: 'Sat', index: 6 },
  { short: 'S', full: 'Sun', index: 0 },
];

const WorkoutPill = ({ workout, onPress, isCompleted }) => {
  const workoutType = workout.workoutType || 'Other';
  const typeColor = COLORS.workoutTypes[workoutType] || COLORS.workoutTypes.Other;

  // Use green for completed, type color for pending
  const displayColor = isCompleted ? COLORS.success : typeColor;

  return (
    <Pressable
      onPress={() => onPress(workout)}
      hitSlop={12}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        layout={Layout.springify().damping(15)}
        style={[
          styles.workoutPill,
          {
            backgroundColor: isCompleted
              ? 'rgba(0, 255, 136, 0.08)'
              : `${typeColor}10`,
            borderColor: isCompleted
              ? 'rgba(0, 255, 136, 0.25)'
              : `${typeColor}30`,
          },
        ]}
      >
        {isCompleted ? (
          <View style={styles.pillCheckmark}>
            <Check size={10} color={COLORS.success} strokeWidth={3} />
          </View>
        ) : (
          <View style={[styles.pillPending, { borderColor: typeColor }]} />
        )}
        <Text
          style={[
            styles.workoutPillText,
            { color: displayColor },
          ]}
          numberOfLines={1}
        >
          {workout.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const DayRow = ({
  day,
  isToday,
  isPast,
  plannedWorkouts,
  hasActualWorkout,
  onPlanDay,
  onWorkoutPress,
  onRemoveWorkout,
}) => {
  const hasPlans = plannedWorkouts.length > 0;

  return (
    <View
      style={[
        styles.dayRow,
        isToday && styles.dayRowToday,
      ]}
    >
      {/* Today indicator bar */}
      {isToday && <View style={styles.todayIndicator} />}

      {/* Day label */}
      <View style={styles.dayLabelContainer}>
        <Text style={[
          styles.dayLabel,
          isToday && styles.dayLabelToday,
          isPast && !hasPlans && styles.dayLabelPast,
        ]}>
          {day.full}
        </Text>
      </View>

      {/* Content area */}
      <View style={styles.dayContent}>
        {hasPlans ? (
          <View style={styles.workoutsContainer}>
            {plannedWorkouts.map((workout) => (
              <WorkoutPill
                key={workout.id}
                workout={workout}
                isCompleted={workout.completed}
                onPress={onWorkoutPress}
                onRemove={onRemoveWorkout}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyDay}>
            <Text style={[
              styles.emptyDayText,
              isToday && styles.emptyDayTextToday,
            ]}>
              {isPast ? 'Rest day' : 'No plans'}
            </Text>
          </View>
        )}
      </View>

      {/* Add button - only this triggers the plan modal */}
      <Pressable
        onPress={() => onPlanDay(day.index)}
        style={({ pressed }) => [
          styles.addButtonContainer,
          isToday && styles.addButtonContainerToday,
          pressed && styles.addButtonPressed,
        ]}
        hitSlop={12}
        accessibilityLabel={`Plan workout for ${day.label}`}
        accessibilityRole="button"
      >
        <Plus
          size={16}
          color={isToday ? COLORS.accent.primary : COLORS.text.tertiary}
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
};

export default function WeeklyPlanCard({
  weekStart,
  getPlannedForDay,
  hasWorkoutOnDay,
  isCurrentWeek,
  today,
  onPlanDay,
  onWorkoutPress,
  onRemoveWorkout,
}) {
  // Calculate which days are in the past
  const isPastDay = (dayIndex) => {
    if (!isCurrentWeek) return false;
    // Convert Sunday (0) to 7 for comparison with Monday-based week
    const todayNum = today === 0 ? 7 : today;
    const dayNum = dayIndex === 0 ? 7 : dayIndex;
    return dayNum < todayNum;
  };

  // Count completed vs total
  const totalPlanned = WEEK_DAYS.reduce((sum, day) => {
    return sum + getPlannedForDay(day.index).length;
  }, 0);

  const totalCompleted = WEEK_DAYS.reduce((sum, day) => {
    return sum + getPlannedForDay(day.index).filter(w => w.completed).length;
  }, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WEEKLY PLAN</Text>
        {totalPlanned > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {totalCompleted}/{totalPlanned}
            </Text>
          </View>
        )}
      </View>

      {/* Days list */}
      <View style={styles.daysContainer}>
        {WEEK_DAYS.map((day, idx) => (
          <React.Fragment key={day.full}>
            <DayRow
              day={day}
              isToday={isCurrentWeek && day.index === today}
              isPast={isPastDay(day.index)}
              plannedWorkouts={getPlannedForDay(day.index)}
              hasActualWorkout={hasWorkoutOnDay(day.index)}
              onPlanDay={onPlanDay}
              onWorkoutPress={onWorkoutPress}
              onRemoveWorkout={onRemoveWorkout}
            />
            {idx < WEEK_DAYS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    letterSpacing: 1.5,
  },
  progressBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },

  // Days container
  daysContainer: {
    paddingBottom: SPACING.sm,
  },

  // Day row
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 56,
    position: 'relative',
  },
  dayRowToday: {
    backgroundColor: COLORS.accent.primaryDim,
  },

  // Today indicator
  todayIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: COLORS.accent.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  // Day label
  dayLabelContainer: {
    width: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  dayLabelToday: {
    color: COLORS.accent.primary,
  },
  dayLabelPast: {
    color: COLORS.text.tertiary,
  },

  // Content
  dayContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  workoutsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  emptyDay: {
    paddingVertical: 2,
  },
  emptyDayText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  emptyDayTextToday: {
    color: COLORS.accent.primary,
    opacity: 0.7,
  },

  // Workout pill
  workoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 2,
  },
  workoutPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillCheckmark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPending: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  workoutPillText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    maxWidth: 100,
  },
  pillRemove: {
    marginLeft: 2,
    padding: 2,
  },

  // Add button
  addButtonContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContainerToday: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  addButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.lg,
  },
});
