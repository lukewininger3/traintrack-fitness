/**
 * ActivityCard - Improved Workout Activity Card
 *
 * Key improvements:
 * 1. Clearer visual hierarchy - workout name is primary
 * 2. Better information grouping
 * 3. Subtle accent strip instead of prominent left border
 * 4. Improved touch feedback
 * 5. Compact and expanded variants
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Activity, Bike, ChevronRight, Clock, Dumbbell, Flame, Waves } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATIONS } from '../../theme/design-v2';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const WORKOUT_ICONS = {
  'Strength': Dumbbell,
  'Running': Activity,
  'Cycling': Bike,
  'Swimming': Waves,
  'Other': Activity,
};

/**
 * Improved activity card with better hierarchy
 *
 * @param {object} workout - Workout data
 * @param {string} variant - 'compact' | 'expanded'
 * @param {function} onPress - Press handler
 * @param {boolean} showChevron - Show right chevron (default: true)
 */
export function ActivityCard({
  workout,
  variant = 'compact',
  onPress,
  showChevron = true,
}) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const Icon = WORKOUT_ICONS[workout.type] || Activity;
  const workoutColor = COLORS.workoutTypes[workout.type] || COLORS.text.tertiary;

  const handlePressIn = () => {
    scale.value = withSpring(0.98, ANIMATIONS.spring.stiff);
    pressed.value = withSpring(1, ANIMATIONS.spring.stiff);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring.default);
    pressed.value = withSpring(0, ANIMATIONS.spring.default);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [COLORS.surface.card, COLORS.surface.cardHover]
    ),
  }));

  // Format date nicely
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Calculate quick stats
  const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;
  const exerciseCount = workout.exercises?.length || 0;

  if (variant === 'expanded') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.expandedContainer, animatedStyle, backgroundStyle]}
      >
        {/* Top accent line */}
        <View style={[styles.topAccent, { backgroundColor: workoutColor }]} />

        {/* Header */}
        <View style={styles.expandedHeader}>
          <View style={[styles.iconContainer, { backgroundColor: workoutColor + '15' }]}>
            <Icon size={20} color={workoutColor} strokeWidth={2} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.workoutName} numberOfLines={1}>
              {workout.name}
            </Text>
            <Text style={styles.workoutMeta}>
              {workout.type} • {formatDate(workout.date)}
            </Text>
          </View>

          {showChevron && (
            <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          )}
        </View>

        {/* Exercise preview */}
        {workout.exercises && workout.exercises.length > 0 && (
          <View style={styles.exercisePreview}>
            {workout.exercises.slice(0, 3).map((exercise, idx) => (
              <View key={idx} style={styles.exerciseRow}>
                <View style={styles.exerciseDot} />
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={styles.exerciseSets}>
                  {exercise.sets?.length || 0} sets
                </Text>
              </View>
            ))}
            {workout.exercises.length > 3 && (
              <Text style={styles.moreExercises}>
                +{workout.exercises.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Stats footer */}
        <View style={styles.statsFooter}>
          <View style={styles.stat}>
            <Dumbbell size={14} color={COLORS.text.tertiary} strokeWidth={2} />
            <Text style={styles.statText}>{exerciseCount} exercises</Text>
          </View>
          <View style={styles.stat}>
            <Flame size={14} color={COLORS.text.tertiary} strokeWidth={2} />
            <Text style={styles.statText}>{totalSets} sets</Text>
          </View>
          {workout.duration && (
            <View style={styles.stat}>
              <Clock size={14} color={COLORS.text.tertiary} strokeWidth={2} />
              <Text style={styles.statText}>{workout.duration}m</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  // Compact variant
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.compactContainer, animatedStyle, backgroundStyle]}
    >
      {/* Left accent */}
      <View style={[styles.leftAccent, { backgroundColor: workoutColor }]} />

      {/* Content */}
      <View style={styles.compactContent}>
        {/* Icon */}
        <View style={[styles.iconContainerSmall, { backgroundColor: workoutColor + '12' }]}>
          <Icon size={18} color={workoutColor} strokeWidth={2} />
        </View>

        {/* Text */}
        <View style={styles.compactText}>
          <Text style={styles.compactName} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={styles.compactMeta}>
            {exerciseCount} exercises • {totalSets} sets
          </Text>
        </View>

        {/* Time badge */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{formatDate(workout.date)}</Text>
        </View>

        {showChevron && (
          <ChevronRight size={18} color={COLORS.text.disabled} strokeWidth={2} />
        )}
      </View>
    </AnimatedPressable>
  );
}

// Section header for activity lists
export function ActivitySectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Expanded variant
  expandedContainer: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  topAccent: {
    height: 3,
    width: '100%',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  workoutName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  workoutMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // Exercise preview
  exercisePreview: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  exerciseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text.tertiary,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    flex: 1,
  },
  exerciseSets: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  moreExercises: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    marginLeft: SPACING.md,
  },

  // Stats footer
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.divider,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  leftAccent: {
    width: 3,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  iconContainerSmall: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    flex: 1,
  },
  compactName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  compactMeta: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  timeText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.screenPadding,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  countBadge: {
    backgroundColor: COLORS.surface.card,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  countText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
});

export default ActivityCard;
