import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { Calendar, TrendingUp, Dumbbell, Activity, Award, ArrowUp, ArrowDown, Zap, Target, Clock, BarChart3 } from 'lucide-react-native';
import { loadWorkouts } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_COLORS,
  analyzeMuscleGroupCoverage,
  getRecoveryStatus,
} from '../utils/muscleGroups';

export default function AnalyticsScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');
  const [consistencyStats, setConsistencyStats] = useState({
    daysThisMonth: 0,
    daysPassed: 0,
    daysLastMonth: 0,
    totalWorkoutsThisMonth: 0,
    totalWorkoutsLastMonth: 0
  });
  const [topExercises, setTopExercises] = useState([]);
  const [workoutTypeBreakdown, setWorkoutTypeBreakdown] = useState([]);
  const [strengthProgression, setStrengthProgression] = useState({
    topGainers: [],
    declining: []
  });
  const [muscleGroupData, setMuscleGroupData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (workouts.length > 0) {
      calculateStats(workouts);
    }
  }, [timeFilter, workouts]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await loadWorkouts({ silent: true });
      setWorkouts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    const firstDayThisMonth = new Date(currentYear, currentMonth, 1);
    const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0);
    const lastMonthFirst = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthLast = new Date(currentYear, currentMonth, 0);

    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    const parseWorkoutDate = (dateStr) => new Date(dateStr + 'T12:00:00');

    const thisMonthWorkouts = data.filter(w => {
      const workoutDate = parseWorkoutDate(w.date);
      return workoutDate >= firstDayThisMonth && workoutDate <= lastDayThisMonth;
    });

    const lastMonthWorkouts = data.filter(w => {
      const workoutDate = parseWorkoutDate(w.date);
      return workoutDate >= lastMonthFirst && workoutDate <= lastMonthLast;
    });

    const lastMonthSameDayCount = lastMonthWorkouts.filter(w => {
      const workoutDate = parseWorkoutDate(w.date);
      return workoutDate.getDate() <= currentDay;
    }).length;

    const uniqueDaysThisMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;

    setConsistencyStats({
      daysThisMonth: uniqueDaysThisMonth,
      daysPassed: currentDay,
      daysLastMonth: lastMonthSameDayCount,
      totalWorkoutsThisMonth: thisMonthWorkouts.length,
      totalWorkoutsLastMonth: lastMonthSameDayCount
    });

    const exerciseSets = {};
    const workoutsToAnalyze = timeFilter === 'month' ? thisMonthWorkouts : data;

    workoutsToAnalyze.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const setsCount = exercise.sets?.length || 0;
        exerciseSets[exercise.name] = (exerciseSets[exercise.name] || 0) + setsCount;
      });
    });

    const sortedExercises = Object.entries(exerciseSets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sets]) => ({ name, sets }));

    setTopExercises(sortedExercises);

    const typeCounts = {};
    thisMonthWorkouts.forEach(workout => {
      typeCounts[workout.type] = (typeCounts[workout.type] || 0) + 1;
    });

    const total = thisMonthWorkouts.length;
    const breakdown = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    setWorkoutTypeBreakdown(breakdown);
    calculateSessionProgression(data);

    // Calculate muscle group coverage
    const muscleData = analyzeMuscleGroupCoverage(data, 14); // Last 14 days
    setMuscleGroupData(muscleData);
  };

  const calculateSessionProgression = (workouts) => {
    const sortedWorkouts = [...workouts].sort((a, b) =>
      new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00')
    );

    const exerciseChanges = [];

    sortedWorkouts.forEach((workout, workoutIdx) => {
      workout.exercises?.forEach(exercise => {
        const hasWeightReps = exercise.sets?.some(set => set.weight > 0 && set.reps > 0);
        if (!hasWeightReps) return;

        const currentMaxWeight = Math.max(...exercise.sets.map(set => set.weight || 0));

        for (let i = workoutIdx + 1; i < sortedWorkouts.length; i++) {
          const prevWorkout = sortedWorkouts[i];
          const prevExercise = prevWorkout.exercises?.find(e => e.name === exercise.name);

          if (prevExercise) {
            const prevSets = prevExercise.sets?.filter(s => s.weight > 0 && s.reps > 0);
            if (prevSets && prevSets.length > 0) {
              const prevMaxWeight = Math.max(...prevSets.map(set => set.weight || 0));

              if (prevMaxWeight > 0) {
                const percentChange = ((currentMaxWeight - prevMaxWeight) / prevMaxWeight) * 100;

                exerciseChanges.push({
                  name: exercise.name,
                  currentWeight: currentMaxWeight,
                  previousWeight: prevMaxWeight,
                  percentChange,
                  currentDate: workout.date,
                  previousDate: prevWorkout.date
                });
              }
              break;
            }
          }
        }
      });
    });

    const topGainers = exerciseChanges
      .filter(e => e.percentChange > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 3);

    const declining = exerciseChanges
      .filter(e => e.percentChange < 0)
      .sort((a, b) => a.percentChange - b.percentChange)
      .slice(0, 3);

    setStrengthProgression({
      topGainers,
      declining
    });
  };

  const getTypeColor = (type) => {
    return COLORS.workoutTypes[type] || COLORS.text.tertiary;
  };

  const consistencyPercentage = consistencyStats.daysPassed > 0
    ? Math.round((consistencyStats.daysThisMonth / consistencyStats.daysPassed) * 100)
    : 0;

  const workoutChange = consistencyStats.totalWorkoutsThisMonth - consistencyStats.totalWorkoutsLastMonth;
  const isPositiveChange = workoutChange >= 0;

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  // Empty state - no workouts yet
  if (workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <BarChart3 size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No Analytics Yet</Text>
        <Text style={styles.emptyDescription}>
          Complete your first workout to start tracking your progress and see detailed analytics.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Strength Progression - Hero Card */}
        {(strengthProgression.topGainers.length > 0 || strengthProgression.declining.length > 0) && (
          <View style={styles.heroCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <TrendingUp size={20} color={COLORS.accent.primary} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.cardTitle}>STRENGTH GAINS</Text>
                <Text style={styles.cardSubtitle}>Session-to-session progress</Text>
              </View>
            </View>

            {strengthProgression.topGainers.length > 0 && (
              <View style={styles.progressionSection}>
                {strengthProgression.topGainers.map((exercise, idx) => (
                  <View key={idx} style={styles.progressionRow}>
                    <View style={styles.progressionInfo}>
                      <Text style={styles.progressionName}>{exercise.name}</Text>
                      <Text style={styles.progressionWeight}>
                        {exercise.previousWeight} → {exercise.currentWeight} lbs
                      </Text>
                    </View>
                    <View style={styles.progressionBadgePositive}>
                      <ArrowUp size={14} color={COLORS.success} strokeWidth={2.5} />
                      <Text style={styles.progressionBadgeTextPositive}>
                        {exercise.percentChange.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {strengthProgression.declining.length > 0 && (
              <View style={[styles.progressionSection, { marginTop: SPACING.md }]}>
                {strengthProgression.declining.map((exercise, idx) => (
                  <View key={idx} style={styles.progressionRow}>
                    <View style={styles.progressionInfo}>
                      <Text style={styles.progressionName}>{exercise.name}</Text>
                      <Text style={styles.progressionWeight}>
                        {exercise.previousWeight} → {exercise.currentWeight} lbs
                      </Text>
                    </View>
                    <View style={styles.progressionBadgeNegative}>
                      <ArrowDown size={14} color={COLORS.error} strokeWidth={2.5} />
                      <Text style={styles.progressionBadgeTextNegative}>
                        {Math.abs(exercise.percentChange).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Consistency Stats - Two Column */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <View style={styles.statHeader}>
              <Target size={18} color={COLORS.accent.primary} strokeWidth={2.5} />
              <Text style={styles.statLabel}>CONSISTENCY</Text>
            </View>
            <Text style={styles.statNumber}>{consistencyPercentage}%</Text>
            <Text style={styles.statDetail}>
              {consistencyStats.daysThisMonth}/{consistencyStats.daysPassed} days
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Zap size={18} color={COLORS.tertiary.primary} strokeWidth={2.5} />
              <Text style={styles.statLabel}>VS LAST MONTH</Text>
            </View>
            <View style={styles.changeRow}>
              <Text style={styles.statNumber}>{consistencyStats.totalWorkoutsThisMonth}</Text>
              <View style={[
                styles.changeBadge,
                isPositiveChange ? styles.changeBadgePositive : styles.changeBadgeNegative
              ]}>
                <Text style={[
                  styles.changeBadgeText,
                  isPositiveChange ? styles.changeBadgeTextPositive : styles.changeBadgeTextNegative
                ]}>
                  {isPositiveChange ? '+' : ''}{workoutChange}
                </Text>
              </View>
            </View>
            <Text style={styles.statDetail}>workouts</Text>
          </View>
        </View>

        {/* Top Exercises */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Dumbbell size={20} color={COLORS.secondary.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>TOP EXERCISES</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('month')}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'month' && styles.filterButtonTextActive]}>
                This Month
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('all')}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'all' && styles.filterButtonTextActive]}>
                All Time
              </Text>
            </Pressable>
          </View>

          {topExercises.length > 0 ? (
            topExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <View style={[styles.rankBadge, index === 0 && styles.rankBadgeFirst]}>
                  <Text style={[styles.rankText, index === 0 && styles.rankTextFirst]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseSets}>{exercise.sets} sets</Text>
                </View>
                {index === 0 && <Award size={20} color={COLORS.accent.primary} fill={COLORS.accent.primary} strokeWidth={2} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises recorded</Text>
            </View>
          )}
        </View>

        {/* Workout Type Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Activity size={20} color={COLORS.success} strokeWidth={2.5} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>WORKOUT TYPES</Text>
              <Text style={styles.cardSubtitle}>This month breakdown</Text>
            </View>
          </View>

          {workoutTypeBreakdown.length > 0 ? (
            workoutTypeBreakdown.map((item, index) => (
              <View key={index} style={styles.typeRow}>
                <View style={styles.typeInfo}>
                  <View style={[styles.typeDot, { backgroundColor: getTypeColor(item.type) }]} />
                  <Text style={styles.typeName}>{item.type}</Text>
                </View>
                <View style={styles.typeStats}>
                  <View style={styles.typeBarContainer}>
                    <View style={[styles.typeBar, {
                      width: `${item.percentage}%`,
                      backgroundColor: getTypeColor(item.type)
                    }]} />
                  </View>
                  <Text style={styles.typePercentage}>{item.percentage}%</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts this month</Text>
            </View>
          )}
        </View>

        {/* Muscle Group Coverage */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Target size={20} color={COLORS.tertiary.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>MUSCLE COVERAGE</Text>
              <Text style={styles.cardSubtitle}>Last 14 days training frequency</Text>
            </View>
          </View>

          <View style={styles.muscleGrid}>
            {MUSCLE_GROUPS.map((muscle) => {
              const data = muscleGroupData[muscle] || { count: 0 };
              const maxCount = Math.max(...Object.values(muscleGroupData).map(d => d?.count || 0), 1);
              const intensity = Math.min(data.count / maxCount, 1);

              return (
                <View key={muscle} style={styles.muscleItem}>
                  <View
                    style={[
                      styles.muscleBox,
                      {
                        backgroundColor: `${MUSCLE_GROUP_COLORS[muscle]}${Math.floor(intensity * 0.7 * 255 + 0.1 * 255).toString(16).padStart(2, '0')}`,
                        borderColor: intensity > 0 ? MUSCLE_GROUP_COLORS[muscle] : COLORS.surface.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.muscleCount,
                      { color: intensity > 0.3 ? COLORS.text.primary : COLORS.text.tertiary }
                    ]}>
                      {Math.round(data.count)}
                    </Text>
                  </View>
                  <Text style={styles.muscleLabel}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recovery Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Clock size={20} color={COLORS.warning} strokeWidth={2.5} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>RECOVERY STATUS</Text>
              <Text style={styles.cardSubtitle}>Days since last training</Text>
            </View>
          </View>

          <View style={styles.recoveryList}>
            {MUSCLE_GROUPS.map((muscle) => {
              const data = muscleGroupData[muscle] || {};
              const status = getRecoveryStatus(data.daysSinceTraining);
              const statusColors = {
                recovered: { bg: 'rgba(0, 255, 136, 0.15)', text: COLORS.success, label: 'Recovered' },
                recent: { bg: 'rgba(255, 214, 0, 0.15)', text: COLORS.warning, label: 'Recent' },
                fatigued: { bg: 'rgba(255, 59, 59, 0.15)', text: COLORS.error, label: 'Rest' },
                untrained: { bg: COLORS.surface.card, text: COLORS.text.tertiary, label: 'No data' },
              };
              const colors = statusColors[status];

              return (
                <View key={muscle} style={styles.recoveryRow}>
                  <View style={[styles.recoveryDot, { backgroundColor: MUSCLE_GROUP_COLORS[muscle] }]} />
                  <Text style={styles.recoveryMuscle}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                  <View style={[styles.recoveryBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.recoveryBadgeText, { color: colors.text }]}>
                      {data.daysSinceTraining !== null
                        ? `${data.daysSinceTraining}d`
                        : '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* All-Time Stats */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>ALL-TIME</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{workouts.length}</Text>
              <Text style={styles.summaryLabel}>Workouts</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)}
              </Text>
              <Text style={styles.summaryLabel}>Exercises</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  // Card Styles
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  statCardAccent: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    fontSize: 10,
  },
  statNumber: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
  },
  statDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  changeBadgePositive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  changeBadgeNegative: {
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
  },
  changeBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  changeBadgeTextPositive: {
    color: COLORS.success,
  },
  changeBadgeTextNegative: {
    color: COLORS.error,
  },

  // Progression
  progressionSection: {
    gap: SPACING.sm,
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  progressionInfo: {
    flex: 1,
  },
  progressionName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  progressionWeight: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  progressionBadgePositive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  progressionBadgeNegative: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  progressionBadgeTextPositive: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.success,
  },
  progressionBadgeTextNegative: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.error,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent.primary,
  },
  filterButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  filterButtonTextActive: {
    color: COLORS.text.inverse,
  },

  // Exercise Row
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rankBadgeFirst: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  rankText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  rankTextFirst: {
    color: COLORS.accent.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  exerciseSets: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Type Row
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  typeName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  typeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBarContainer: {
    width: 80,
    height: 6,
    backgroundColor: COLORS.background.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  typeBar: {
    height: '100%',
    borderRadius: 3,
  },
  typePercentage: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.secondary,
    width: 36,
    textAlign: 'right',
  },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  summaryTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.surface.border,
  },

  // Empty State
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Muscle Group Coverage
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  muscleItem: {
    width: '18%',
    alignItems: 'center',
  },
  muscleBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  muscleCount: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  muscleLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Recovery Status
  recoveryList: {
    gap: SPACING.sm,
  },
  recoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  recoveryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.md,
  },
  recoveryMuscle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  recoveryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  recoveryBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
});
