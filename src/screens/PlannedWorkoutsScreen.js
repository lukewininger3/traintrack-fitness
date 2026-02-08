import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Activity, Bike, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, Play, Waves } from 'lucide-react-native';
import { loadWeeklyGoals, getWeekStart, formatWeekRange, DAY_NAMES } from '../utils/goalsStorage';
import { getTodayString } from '../utils/storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

// Reorder days: Mon-Sat, then Sun (indices 1-6, then 0)
const ORDERED_DAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

export default function PlannedWorkoutsScreen() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [goals, setGoals] = useState(null);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [weekStart])
  );

  const loadData = async () => {
    const data = await loadWeeklyGoals(weekStart);
    setGoals(data);
    setPlannedWorkouts(data?.plannedWorkouts || []);
  };

  const getWorkoutIcon = (type) => {
    const icons = {
      'Strength': Dumbbell,
      'Running': Activity,
      'Cycling': Bike,
      'Swimming': Waves,
      'Other': Activity
    };
    return icons[type] || Activity;
  };

  const getWorkoutColor = (type) => {
    return COLORS.workoutTypes[type] || COLORS.text.tertiary;
  };

  const startWorkout = (workout) => {
    const today = getTodayString();
    const workoutDetails = {
      name: workout.name,
      type: workout.workoutType,
      date: today,
      plannedExercises: workout.exercises || [],
      plannedWorkoutId: workout.id,
    };

    router.push({
      pathname: '/workout-details',
      params: {
        workoutDetails: JSON.stringify(workoutDetails),
      },
    });
  };

  const toggleWorkoutExpanded = (workoutId) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [workoutId]: !prev[workoutId]
    }));
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekStart(prevWeek.toISOString().split('T')[0]);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekStart(nextWeek.toISOString().split('T')[0]);
  };

  // Group workouts by day
  const workoutsByDay = plannedWorkouts.reduce((acc, workout) => {
    const day = workout.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(workout);
    return acc;
  }, {});

  // Get today's day of week
  const todayDayOfWeek = new Date().getDay();
  const isCurrentWeek = weekStart === getWeekStart();

  // Count total and completed workouts
  const totalWorkouts = plannedWorkouts.length;
  const completedWorkouts = plannedWorkouts.filter(w => w.completed).length;
  const progress = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0;

  // Find next upcoming workout
  const getNextWorkout = () => {
    if (!isCurrentWeek) return null;

    // Find first uncompleted workout starting from today
    for (let i = 0; i < 7; i++) {
      const checkDay = (todayDayOfWeek + i) % 7;
      const dayWorkouts = workoutsByDay[checkDay] || [];
      const uncompleted = dayWorkouts.find(w => !w.completed);
      if (uncompleted) {
        return {
          workout: uncompleted,
          dayIndex: checkDay,
          dayName: DAY_NAMES[checkDay],
          isToday: checkDay === todayDayOfWeek
        };
      }
    }
    return null;
  };

  const nextWorkout = getNextWorkout();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>PLANNED WORKOUTS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <Pressable onPress={goToPreviousWeek} style={styles.weekNavButton}>
            <ChevronLeft size={20} color={COLORS.text.secondary} strokeWidth={2} />
          </Pressable>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavLabel}>{formatWeekRange(weekStart)}</Text>
            {isCurrentWeek && (
              <View style={styles.currentWeekBadge}>
                <Text style={styles.currentWeekBadgeText}>THIS WEEK</Text>
              </View>
            )}
          </View>
          <Pressable onPress={goToNextWeek} style={styles.weekNavButton}>
            <ChevronRight size={20} color={COLORS.text.secondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Next Workout Card */}
        {nextWorkout && (
          <View style={styles.nextWorkoutCard}>
            <View style={styles.nextWorkoutHeader}>
              <Text style={styles.nextWorkoutLabel}>
                {nextWorkout.isToday ? 'TODAY\'S WORKOUT' : `NEXT UP · ${nextWorkout.dayName.toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.nextWorkoutContent}>
              <View style={[styles.nextWorkoutIcon, { backgroundColor: getWorkoutColor(nextWorkout.workout.workoutType) + '20' }]}>
                {React.createElement(getWorkoutIcon(nextWorkout.workout.workoutType), {
                  size: 24,
                  color: getWorkoutColor(nextWorkout.workout.workoutType),
                  strokeWidth: 2
                })}
              </View>
              <View style={styles.nextWorkoutInfo}>
                <Text style={styles.nextWorkoutName}>{nextWorkout.workout.name}</Text>
                <Text style={styles.nextWorkoutMeta}>
                  {nextWorkout.workout.workoutType}
                  {nextWorkout.workout.exercises?.length > 0 && ` · ${nextWorkout.workout.exercises.length} exercises`}
                </Text>
              </View>
              <Pressable
                style={styles.nextWorkoutStartButton}
                onPress={() => startWorkout(nextWorkout.workout)}
              >
                <Play size={16} color={COLORS.text.inverse} strokeWidth={2.5} fill={COLORS.text.inverse} />
                <Text style={styles.nextWorkoutStartText}>Start</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Progress Bar */}
        {totalWorkouts > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESS</Text>
              <Text style={styles.progressPercent}>{completedWorkouts}/{totalWorkouts}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
            </View>
          </View>
        )}

        {/* Empty State */}
        {totalWorkouts === 0 && (
          <View style={styles.emptyState}>
            <Dumbbell size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No workouts planned</Text>
            <Text style={styles.emptySubtitle}>
              Plan your workouts from the Goals tab to see them here
            </Text>
            <Pressable
              style={styles.planButton}
              onPress={() => router.push('/(tabs)/goals')}
            >
              <Text style={styles.planButtonText}>Plan Workouts</Text>
            </Pressable>
          </View>
        )}

        {/* Workouts by Day - Ordered Mon-Sat, then Sun */}
        {ORDERED_DAY_INDICES.map((dayIndex) => {
          const dayWorkouts = workoutsByDay[dayIndex] || [];
          if (dayWorkouts.length === 0) return null;

          const dayName = DAY_NAMES[dayIndex];
          const isToday = isCurrentWeek && dayIndex === todayDayOfWeek;

          return (
            <View key={dayIndex} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                  {dayName.toUpperCase()}
                </Text>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>TODAY</Text>
                  </View>
                )}
              </View>

              {dayWorkouts.map((workout) => {
                const Icon = getWorkoutIcon(workout.workoutType);
                const color = getWorkoutColor(workout.workoutType);
                const isCompleted = workout.completed;
                const isExpanded = expandedWorkouts[workout.id];
                const hasExercises = workout.exercises?.length > 0;

                return (
                  <View key={workout.id}>
                    <Pressable
                      style={[
                        styles.workoutCard,
                        isCompleted && styles.workoutCardCompleted,
                      ]}
                      onPress={() => hasExercises && toggleWorkoutExpanded(workout.id)}
                    >
                      <View style={styles.workoutCardHeader}>
                        {isCompleted ? (
                          <View style={styles.completedIcon}>
                            <Check size={16} color={COLORS.text.inverse} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={[styles.workoutIcon, { backgroundColor: color + '20' }]}>
                            <Icon size={20} color={color} strokeWidth={2} />
                          </View>
                        )}
                        <View style={styles.workoutInfo}>
                          <Text style={[
                            styles.workoutName,
                            isCompleted && styles.workoutNameCompleted
                          ]}>
                            {workout.name}
                          </Text>
                          <Text style={styles.workoutMeta}>
                            {workout.workoutType}
                            {workout.exercises?.length > 0 && ` · ${workout.exercises.length} exercises`}
                          </Text>
                        </View>
                        {!isCompleted && (
                          <Pressable
                            style={styles.startButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              startWorkout(workout);
                            }}
                          >
                            <Play size={14} color={COLORS.text.inverse} strokeWidth={2.5} fill={COLORS.text.inverse} />
                            <Text style={styles.startButtonText}>Start</Text>
                          </Pressable>
                        )}
                        {hasExercises && (
                          <View style={styles.expandIcon}>
                            {isExpanded ? (
                              <ChevronUp size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                            ) : (
                              <ChevronDown size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                            )}
                          </View>
                        )}
                      </View>
                    </Pressable>

                    {/* Exercise List Dropdown */}
                    {isExpanded && hasExercises && (
                      <View style={styles.exerciseList}>
                        {workout.exercises.map((exercise, idx) => (
                          <View key={idx} style={styles.exerciseRow}>
                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                            {exercise.sets?.length > 0 && (
                              <Text style={styles.exerciseDetail}>
                                {exercise.sets.length} sets
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Week Navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekNavLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  currentWeekBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  currentWeekBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },

  // Next Workout Card
  nextWorkoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.accent.primary + '40',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  nextWorkoutHeader: {
    marginBottom: SPACING.md,
  },
  nextWorkoutLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.accent.primary,
  },
  nextWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  nextWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextWorkoutInfo: {
    flex: 1,
  },
  nextWorkoutName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  nextWorkoutMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  nextWorkoutStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  nextWorkoutStartText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text.inverse,
  },

  // Progress
  progressSection: {
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  progressPercent: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.accent.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 3,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  planButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  planButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Day Section
  daySection: {
    marginBottom: SPACING.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dayName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  dayNameToday: {
    color: COLORS.accent.primary,
  },
  todayBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  todayBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },

  // Workout Card
  workoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutCardCompleted: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '30',
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  workoutNameCompleted: {
    color: COLORS.text.secondary,
  },
  workoutMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  startButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.inverse,
  },
  expandIcon: {
    padding: SPACING.xs,
  },

  // Exercise List
  exerciseList: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginTop: 0,
    marginBottom: SPACING.sm,
    marginHorizontal: 0,
    gap: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text.primary,
    flex: 1,
  },
  exerciseDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
});
