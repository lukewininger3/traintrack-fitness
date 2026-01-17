import { Check, Plus, X, Circle, Dumbbell } from 'lucide-react-native';
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

const CheckmarkIcon = ({ completed }) => {
  const scale = useSharedValue(completed ? 1 : 0);

  React.useEffect(() => {
    if (completed) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
    } else {
      scale.value = withSpring(0);
    }
  }, [completed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!completed) return null;

  return (
    <Animated.View style={[styles.checkmarkContainer, animatedStyle]}>
      <Check size={10} color={COLORS.text.inverse} strokeWidth={3} />
    </Animated.View>
  );
};

const WorkoutPill = ({ workout, onRemove, isCompleted }) => {
  const workoutType = workout.workoutType || 'Other';
  const typeColor = COLORS.workoutTypes[workoutType] || COLORS.workoutTypes.Other;

  // Use green for completed, type color for pending
  const displayColor = isCompleted ? COLORS.success : typeColor;

  return (
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
      <View style={styles.workoutPillContent}>
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
      </View>
      {!isCompleted && onRemove && (
        <Pressable
          onPress={() => onRemove(workout.id)}
          hitSlop={8}
          style={styles.pillRemove}
        >
          <X size={12} color={typeColor} style={{ opacity: 0.6 }} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const DayRow = ({
  day,
  isToday,
  isPast,
  plannedWorkouts,
  hasActualWorkout,
  onPlanDay,
  onRemoveWorkout,
}) => {
  const hasPlans = plannedWorkouts.length > 0;
  const allCompleted = hasPlans && plannedWorkouts.every(w => w.completed);
  const someCompleted = hasPlans && plannedWorkouts.some(w => w.completed);

  return (
    <Pressable
      onPress={() => onPlanDay(day.index)}
      style={({ pressed }) => [
        styles.dayRow,
        isToday && styles.dayRowToday,
        pressed && styles.dayRowPressed,
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
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
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
              {isPast ? 'Rest day' : 'Tap to plan'}
            </Text>
          </View>
        )}
      </View>

      {/* Add button */}
      <View style={[
        styles.addButtonContainer,
        isToday && styles.addButtonContainerToday,
      ]}>
        <Plus
          size={16}
          color={isToday ? COLORS.accent.primary : COLORS.text.tertiary}
          strokeWidth={2}
        />
      </View>
    </Pressable>
  );
};

export default function WeeklyPlanCard({
  weekStart,
  getPlannedForDay,
  hasWorkoutOnDay,
  isCurrentWeek,
  today,
  onPlanDay,
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
  dayRowPressed: {
    opacity: 0.7,
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
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
  todayBadge: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.text.inverse,
    letterSpacing: 0.5,
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
    paddingRight: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
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

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.lg,
  },

  // Checkmark animation
  checkmarkContainer: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
