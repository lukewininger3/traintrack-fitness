import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Check, Play, X } from 'lucide-react-native';
import { getActiveProgram, getNextWorkout, cancelProgram, completeWorkout } from '../utils/programs';
import { getTodayString } from '../utils/storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

export default function ProgramDetailScreen() {
  const [program, setProgram] = useState(null);
  const [nextWorkout, setNextWorkout] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveProgram();
    setProgram(active);

    const next = await getNextWorkout();
    setNextWorkout(next);
  };

  const handleStartWorkout = () => {
    if (!nextWorkout) return;

    const workoutDetails = {
      name: `${nextWorkout.programName} - ${nextWorkout.dayName}`,
      type: 'Strength',
      date: getTodayString(),
      plannedExercises: nextWorkout.exercises.map(e => e.name),
    };

    // Navigate to workout builder with pre-filled exercises
    router.push({
      pathname: '/workout-details',
      params: {
        workoutDetails: JSON.stringify(workoutDetails),
        repeatData: JSON.stringify({
          name: workoutDetails.name,
          type: workoutDetails.type,
          exercises: nextWorkout.exercises,
        }),
      },
    });
  };

  const handleCancelProgram = () => {
    Alert.alert(
      'Cancel Program',
      'Are you sure you want to cancel this program? Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Program',
          style: 'destructive',
          onPress: async () => {
            await cancelProgram();
            router.back();
          },
        },
      ]
    );
  };

  if (!program) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>PROGRAM</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active program</Text>
          <Pressable
            style={styles.browseButton}
            onPress={() => router.replace('/programs')}
          >
            <Text style={styles.browseButtonText}>Browse Programs</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { template, currentWeek, currentDay, completedWorkouts } = program;
  const progress = completedWorkouts.length / (template.duration * template.schedule.length);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{template.name.toUpperCase()}</Text>
        <Pressable onPress={handleCancelProgram} style={styles.cancelButton}>
          <X size={20} color={COLORS.error} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>PROGRESS</Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>
          <Text style={styles.progressMeta}>
            Week {currentWeek} of {template.duration} · {completedWorkouts.length} workouts completed
          </Text>
        </View>

        {/* Next Workout Card */}
        {nextWorkout && (
          <View style={styles.nextWorkoutCard}>
            <View style={styles.nextWorkoutHeader}>
              <View>
                <Text style={styles.nextWorkoutLabel}>NEXT WORKOUT</Text>
                <Text style={styles.nextWorkoutName}>{nextWorkout.dayName}</Text>
                <Text style={styles.nextWorkoutMeta}>
                  Week {nextWorkout.weekNumber} · Day {nextWorkout.dayNumber}
                </Text>
              </View>
            </View>

            {/* Exercise List */}
            <View style={styles.exerciseList}>
              {nextWorkout.exercises.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDetail}>
                    {exercise.sets.length} × {exercise.sets[0]?.reps || 0}
                    {exercise.sets[0]?.weight > 0 && ` @ ${exercise.sets[0].weight} lbs`}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.startWorkoutButton} onPress={handleStartWorkout}>
              <Play size={18} color={COLORS.text.inverse} strokeWidth={2.5} fill={COLORS.text.inverse} />
              <Text style={styles.startWorkoutText}>Start Workout</Text>
            </Pressable>
          </View>
        )}

        {/* Week-by-Week Schedule */}
        <Text style={styles.sectionTitle}>SCHEDULE</Text>

        {Array.from({ length: template.duration }, (_, weekIdx) => {
          const weekNum = weekIdx + 1;
          const isCurrent = weekNum === currentWeek;

          return (
            <View key={weekIdx} style={[styles.weekCard, isCurrent && styles.weekCardCurrent]}>
              <View style={styles.weekHeader}>
                <Text style={[styles.weekTitle, isCurrent && styles.weekTitleCurrent]}>
                  WEEK {weekNum}
                </Text>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>

              {template.schedule.map((day, dayIdx) => {
                const dayNum = dayIdx + 1;
                const isCompleted = completedWorkouts.some(
                  c => c.week === weekNum && c.day === dayNum
                );
                const isNext = weekNum === currentWeek && dayNum === currentDay;

                return (
                  <View key={dayIdx} style={styles.scheduleDayRow}>
                    <View style={[
                      styles.dayIndicator,
                      isCompleted && styles.dayIndicatorComplete,
                      isNext && styles.dayIndicatorNext,
                    ]}>
                      {isCompleted ? (
                        <Check size={12} color={COLORS.text.inverse} strokeWidth={3} />
                      ) : (
                        <Text style={[
                          styles.dayIndicatorText,
                          isNext && styles.dayIndicatorTextNext,
                        ]}>
                          {dayNum}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleDayInfo}>
                      <Text style={[
                        styles.scheduleDayName,
                        isCompleted && styles.scheduleDayNameComplete,
                      ]}>
                        {day.name}
                      </Text>
                      <Text style={styles.scheduleDayExercises}>
                        {day.exercises.length} exercises
                      </Text>
                    </View>
                    {isNext && (
                      <ChevronRight size={16} color={COLORS.accent.primary} strokeWidth={2} />
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  cancelButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
  },
  browseButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  browseButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Progress
  progressSection: {
    marginBottom: SPACING.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  progressPercent: {
    ...TYPOGRAPHY.statSmall,
    color: COLORS.accent.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 3,
  },
  progressMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  // Next Workout
  nextWorkoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.accent.primary + '30',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  nextWorkoutHeader: {
    marginBottom: SPACING.md,
  },
  nextWorkoutLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.accent.primary,
    marginBottom: 4,
  },
  nextWorkoutName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  nextWorkoutMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  exerciseList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  exerciseDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  startWorkoutText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Schedule
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  weekCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  weekCardCurrent: {
    borderColor: COLORS.accent.primary + '40',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  weekTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  weekTitleCurrent: {
    color: COLORS.accent.primary,
  },
  currentBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  currentBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  scheduleDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  dayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicatorComplete: {
    backgroundColor: COLORS.success,
  },
  dayIndicatorNext: {
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.accent.primary,
  },
  dayIndicatorText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  dayIndicatorTextNext: {
    color: COLORS.accent.primary,
  },
  scheduleDayInfo: {
    flex: 1,
  },
  scheduleDayName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontSize: 13,
  },
  scheduleDayNameComplete: {
    color: COLORS.text.tertiary,
  },
  scheduleDayExercises: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
});
