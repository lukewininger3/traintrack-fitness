import { Activity, ArrowDown, ArrowUp, Bike, ChevronLeft, ChevronRight, Dumbbell, Flame, Scale, Target, TrendingUp, Waves, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { calculateWeekStreak } from '../utils/calculations';
import { getTodayString, loadWorkouts } from '../utils/storage';
import { loadWeightData, calculateWeightProgress, formatWeight } from '../utils/weightStorage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - SPACING.lg * 2 - SPACING.lg * 2 - 52 - 14) / 7;
const DAY_HEIGHT = DAY_WIDTH + 4; // Slightly taller for icons

export default function DashboardScreen({ navigation }) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [weekStreak, setWeekStreak] = useState(0);
  const [selectedWorkouts, setSelectedWorkouts] = useState(null);
  const [weightData, setWeightData] = useState(null);
  const [consistencyStats, setConsistencyStats] = useState({
    daysThisMonth: 0,
    daysPassed: 0,
    totalWorkoutsThisMonth: 0,
    totalWorkoutsLastMonth: 0
  });
  const [strengthProgression, setStrengthProgression] = useState({
    topGainers: [],
    declining: []
  });

  useEffect(() => {
    loadData();
  }, []);

  // Reload data every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        loadData();
      }, 50);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadData = async () => {
    const data = await loadWorkouts({ silent: true });
    setWorkouts(data || []);
    setWeekStreak(calculateWeekStreak(data || []));
    calculateStats(data || []);

    // Load weight data
    const weight = await loadWeightData();
    setWeightData(weight);
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

    const thisMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= firstDayThisMonth && workoutDate <= lastDayThisMonth;
    });

    const lastMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= lastMonthFirst && workoutDate <= lastMonthLast;
    });

    const lastMonthSameDayCount = lastMonthWorkouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate.getDate() <= currentDay;
    }).length;

    const uniqueDaysThisMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;

    setConsistencyStats({
      daysThisMonth: uniqueDaysThisMonth,
      daysPassed: currentDay,
      totalWorkoutsThisMonth: thisMonthWorkouts.length,
      totalWorkoutsLastMonth: lastMonthSameDayCount
    });

    calculateSessionProgression(data);
  };

  const calculateSessionProgression = (workoutsData) => {
    const sortedWorkouts = [...workoutsData].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    const exerciseChanges = [];
    const seenExercises = new Set();

    sortedWorkouts.forEach((workout, workoutIdx) => {
      workout.exercises?.forEach(exercise => {
        // Skip if we've already tracked this exercise (deduplication)
        if (seenExercises.has(exercise.name)) return;

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
                  percentChange
                });
                seenExercises.add(exercise.name);
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
      .slice(0, 2);

    setStrengthProgression({ topGainers, declining });
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

  const previousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const getCurrentMonthName = () => {
    return new Date(calendarYear, calendarMonth).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  };

  const dateHasWorkout = (dateStr) => {
    return workouts.some(w => w.date === dateStr);
  };

  // Get unique workout types for a date
  const getWorkoutTypesForDate = (dateStr) => {
    const dayWorkouts = workouts.filter(w => w.date === dateStr);
    const types = [...new Set(dayWorkouts.map(w => w.type))];
    return types;
  };

  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = getTodayString();

    const calendar = [];
    let week = [];
    let weekHasWorkoutInAdjacentMonth = false;

    if (startingDayOfWeek > 0) {
      const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0);
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const prevDay = prevMonthLastDay.getDate() - i;
        const prevMonth = calendarMonth === 0 ? 12 : calendarMonth;
        const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
        const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
        if (dateHasWorkout(dateStr)) {
          weekHasWorkoutInAdjacentMonth = true;
          break;
        }
      }
    }

    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const workoutTypes = getWorkoutTypesForDate(dateStr);

      week.push({
        day,
        date: dateStr,
        hasWorkout: dayWorkouts.length > 0,
        workoutTypes: workoutTypes,
        workoutCount: dayWorkouts.length,
        isToday: dateStr === today
      });

      if (week.length === 7) {
        week.adjacentMonthHasWorkout = weekHasWorkoutInAdjacentMonth;
        calendar.push(week);
        week = [];
        weekHasWorkoutInAdjacentMonth = false;
      }
    }

    if (week.length > 0) {
      const remainingDays = 7 - week.length;
      for (let i = 1; i <= remainingDays; i++) {
        const nextMonth = calendarMonth === 11 ? 1 : calendarMonth + 2;
        const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (dateHasWorkout(dateStr)) {
          weekHasWorkoutInAdjacentMonth = true;
          break;
        }
      }

      while (week.length < 7) {
        week.push(null);
      }
      week.adjacentMonthHasWorkout = weekHasWorkoutInAdjacentMonth;
      calendar.push(week);
    }

    return calendar;
  }, [calendarMonth, calendarYear, workouts]);

  const monthWorkoutCount = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    return workouts.filter(w => {
      const d = new Date(w.date);
      return d >= firstDay && d <= lastDay;
    }).length;
  }, [workouts, calendarMonth, calendarYear]);

  const consistencyPercentage = consistencyStats.daysPassed > 0
    ? Math.round((consistencyStats.daysThisMonth / consistencyStats.daysPassed) * 100)
    : 0;

  const workoutChange = consistencyStats.totalWorkoutsThisMonth - consistencyStats.totalWorkoutsLastMonth;
  const isPositiveChange = workoutChange >= 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Month Nav with Week Streak */}
          <View style={styles.monthNav}>
            <Pressable onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={20} color={COLORS.text.primary} strokeWidth={2.5} />
            </Pressable>

            <View style={styles.monthCenter}>
              <Text style={styles.monthText}>{getCurrentMonthName()}</Text>
            </View>

            <Pressable onPress={nextMonth} style={styles.navButton}>
              <ChevronRight size={20} color={COLORS.text.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.dayHeader}>{day}</Text>
            ))}
            <View style={styles.weekHeaderSpacer} />
          </View>

          {calendarData.map((week, weekIdx) => {
            const hasWorkoutInVisibleDays = week.some(day => day?.hasWorkout);
            const hasWorkoutThisWeek = hasWorkoutInVisibleDays || week.adjacentMonthHasWorkout;
            const today = getTodayString();
            const isCurrentWeek = week.some(day => day?.date === today);

            return (
              <View key={weekIdx} style={styles.weekRow}>
                <View style={styles.daysRow}>
                  {week.map((day, dayIdx) => {
                    const isFutureDay = day && day.date > today;
                    const workoutTypes = day?.workoutTypes || [];
                    const primaryColor = workoutTypes.length > 0 ? getWorkoutColor(workoutTypes[0]) : null;

                    const workoutCount = day?.workoutCount || 0;
                    const hasMultiple = workoutCount > 1;

                    return (
                      <Pressable
                        key={dayIdx}
                        disabled={!day}
                        onPress={() => {
                          if (day?.hasWorkout) {
                            const dayWorkouts = workouts.filter(w => w.date === day.date);
                            if (dayWorkouts.length > 0) {
                              setSelectedWorkouts(dayWorkouts);
                            }
                          }
                        }}
                        style={[
                          styles.dayButton,
                          !day && styles.dayInvisible,
                        ]}
                      >
                        {/* Main day cell */}
                        <View style={[
                          styles.dayInner,
                          day?.isToday && styles.dayToday,
                          day?.hasWorkout && !day?.isToday && {
                            backgroundColor: primaryColor + '20',
                            borderWidth: 1.5,
                            borderColor: primaryColor + '40',
                          },
                        ]}>
                          {/* Show icon instead of date for workout days */}
                          {day?.hasWorkout ? (
                            <>
                              <View style={styles.workoutIconCenter}>
                                {React.createElement(getWorkoutIcon(workoutTypes[0]), {
                                  size: 18,
                                  color: day?.isToday ? COLORS.text.inverse : primaryColor,
                                  strokeWidth: 2.5
                                })}
                              </View>
                              {/* Show a dot for each additional workout */}
                              {workoutCount > 1 && (
                                <View style={styles.additionalWorkoutDots}>
                                  {workouts
                                    .filter(w => w.date === day.date)
                                    .slice(1, 4)
                                    .map((w, i) => (
                                      <View
                                        key={i}
                                        style={[
                                          styles.additionalDot,
                                          { backgroundColor: getWorkoutColor(w.type) }
                                        ]}
                                      />
                                    ))}
                                </View>
                              )}
                            </>
                          ) : (
                            <Text style={[
                              styles.dayText,
                              day?.isToday && styles.dayTextToday,
                              isFutureDay && styles.dayTextFuture,
                              !isFutureDay && !day?.isToday && styles.dayTextPast
                            ]}>
                              {day?.day}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Week Indicator - shows streak number inside fire icon */}
                <View style={styles.weekIndicator}>
                  {isCurrentWeek && weekStreak > 0 ? (
                    <View style={styles.fireStreakContainer}>
                      <Flame
                        size={32}
                        color={COLORS.accent.primary}
                        fill={COLORS.accent.primary}
                        strokeWidth={1.5}
                      />
                      <Text style={styles.fireStreakNumber}>{weekStreak}</Text>
                    </View>
                  ) : hasWorkoutThisWeek ? (
                    <View style={styles.weekCircleFilled} />
                  ) : (
                    <View style={styles.weekCircle} />
                  )}
                </View>
              </View>
            );
          })}

          {/* Legend - inside calendar card */}
          <View style={styles.legend}>
            {Object.entries(COLORS.workoutTypes)
              .filter(([type]) => type !== 'Other')
              .map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  {React.createElement(getWorkoutIcon(type), {
                    size: 12,
                    color: color,
                    strokeWidth: 2.5
                  })}
                  <Text style={styles.legendText}>{type}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Strength Progression - Minimalist */}
        {(strengthProgression.topGainers.length > 0 || strengthProgression.declining.length > 0) && (
          <View style={styles.strengthCard}>
            <View style={styles.strengthHeader}>
              <TrendingUp size={16} color={COLORS.text.secondary} strokeWidth={2} />
              <Text style={styles.strengthTitle}>RECENT GAINS</Text>
            </View>

            <View style={styles.strengthList}>
              {strengthProgression.topGainers.map((exercise, idx) => (
                <View key={`gain-${idx}`} style={styles.strengthRow}>
                  <Text style={styles.strengthName} numberOfLines={1}>{exercise.name}</Text>
                  <View style={styles.strengthChange}>
                    <Text style={styles.strengthWeightSmall}>
                      {exercise.previousWeight}→{exercise.currentWeight}
                    </Text>
                    <View style={styles.strengthBadge}>
                      <ArrowUp size={10} color={COLORS.success} strokeWidth={3} />
                      <Text style={styles.strengthBadgeText}>
                        {exercise.percentChange.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {strengthProgression.declining.map((exercise, idx) => (
                <View key={`decline-${idx}`} style={styles.strengthRow}>
                  <Text style={styles.strengthName} numberOfLines={1}>{exercise.name}</Text>
                  <View style={styles.strengthChange}>
                    <Text style={styles.strengthWeightSmall}>
                      {exercise.previousWeight}→{exercise.currentWeight}
                    </Text>
                    <View style={[styles.strengthBadge, styles.strengthBadgeNeg]}>
                      <ArrowDown size={10} color={COLORS.error} strokeWidth={3} />
                      <Text style={[styles.strengthBadgeText, styles.strengthBadgeTextNeg]}>
                        {Math.abs(exercise.percentChange).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Consistency Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Target size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
              <Text style={styles.statLabel}>THIS MONTH</Text>
            </View>
            <Text style={styles.statNumber}>{consistencyPercentage}%</Text>
            <Text style={styles.statDetail}>
              {consistencyStats.daysThisMonth}/{consistencyStats.daysPassed} days
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Zap size={16} color={COLORS.tertiary.primary} strokeWidth={2.5} />
              <Text style={styles.statLabel}>VS LAST</Text>
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

        {/* Weight Tracking Card */}
        <Pressable
          style={styles.weightCard}
          onPress={() => router.push('/(tabs)/goals')}
        >
          <View style={styles.weightCardHeader}>
            <View style={styles.weightCardIcon}>
              <Scale size={18} color={COLORS.tertiary.primary} strokeWidth={2} />
            </View>
            <Text style={styles.weightCardTitle}>WEIGHT</Text>
          </View>
          {weightData?.entries?.length > 0 ? (
            <View style={styles.weightCardContent}>
              <Text style={styles.weightCardValue}>
                {formatWeight(weightData.entries[0]?.weight, weightData?.settings?.unit || 'lbs')}
              </Text>
              {weightData.goal && (() => {
                const progress = calculateWeightProgress(weightData);
                return progress ? (
                  <View style={styles.weightCardProgress}>
                    <View style={styles.weightProgressBarSmall}>
                      <View
                        style={[
                          styles.weightProgressFillSmall,
                          { width: `${progress.progress}%` },
                          progress.isComplete && styles.weightProgressComplete
                        ]}
                      />
                    </View>
                    <Text style={styles.weightCardGoal}>
                      Goal: {formatWeight(progress.targetWeight, weightData?.settings?.unit || 'lbs')}
                    </Text>
                  </View>
                ) : null;
              })()}
              <Text style={styles.weightCardHint}>Tap to log weight →</Text>
            </View>
          ) : (
            <View style={styles.weightCardEmpty}>
              <Text style={styles.weightCardEmptyText}>No weight logged yet</Text>
              <Text style={styles.weightCardHint}>Tap to start tracking →</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Workout Detail Modal - supports multiple workouts */}
      {selectedWorkouts && selectedWorkouts.length > 0 && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedWorkouts(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderCompact}>
              <View style={styles.modalHandle} />
              <Pressable
                onPress={() => setSelectedWorkouts(null)}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedWorkouts.map((workout, wIdx) => (
                <View key={wIdx} style={styles.workoutSection}>
                  <View style={styles.workoutHeader}>
                    <View style={[styles.workoutIconBadge, { backgroundColor: getWorkoutColor(workout.type) + '15' }]}>
                      {React.createElement(getWorkoutIcon(workout.type), {
                        size: 22,
                        color: getWorkoutColor(workout.type),
                        strokeWidth: 2.5
                      })}
                    </View>
                    <View style={styles.workoutHeaderText}>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutMeta}>{workout.type} • {workout.date}</Text>
                    </View>
                  </View>
                  {workout.exercises?.map((exercise, idx) => (
                    <View key={idx} style={styles.exerciseCard}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      {exercise.sets?.map((set, setIdx) => (
                        <View key={setIdx} style={styles.setRow}>
                          <Text style={styles.setLabel}>SET {setIdx + 1}</Text>
                          <Text style={styles.setValue}>
                            {set.distance > 0 && set.time > 0
                              ? `${set.distance} mi • ${set.time} min`
                              : `${set.weight} lbs × ${set.reps} reps`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
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

  // Calendar Card
  calendarCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  monthText: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },

  // Day Headers
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  dayHeader: {
    width: DAY_WIDTH,
    textAlign: 'center',
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginHorizontal: 1,
  },
  weekHeaderSpacer: {
    width: 36,
    marginLeft: SPACING.sm,
  },

  // Week Row
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    alignItems: 'center',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayButton: {
    width: DAY_WIDTH,
    height: DAY_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    position: 'relative',
  },
  dayInvisible: {
    opacity: 0,
  },
  dayInner: {
    width: DAY_WIDTH - 2,
    height: DAY_HEIGHT - 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    position: 'relative',
  },
  dayToday: {
    backgroundColor: COLORS.accent.primary,
    borderWidth: 0,
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
    color: COLORS.text.tertiary,
  },
  dayTextPast: {
    color: COLORS.text.secondary,
  },
  // Workout icon centered
  workoutIconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Additional workout type dots (shown below icon)
  additionalWorkoutDots: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 3,
  },
  additionalDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Week Indicator
  weekIndicator: {
    width: 36,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.surface.border,
  },
  weekCircleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent.primary,
  },
  fireStreakContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 36,
  },
  fireStreakNumber: {
    position: 'absolute',
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    top: 13,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },

  // Strength Card - Minimalist
  strengthCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  strengthTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  strengthList: {
    gap: SPACING.sm,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthName: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  strengthChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  strengthWeightSmall: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  strengthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  strengthBadgeNeg: {
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
  },
  strengthBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  strengthBadgeTextNeg: {
    color: COLORS.error,
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
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    fontSize: 9,
  },
  statNumber: {
    ...TYPOGRAPHY.statMedium,
    fontSize: 28,
    color: COLORS.text.primary,
  },
  statDetail: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  changeBadgePositive: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  changeBadgeNegative: {
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
  },
  changeBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  changeBadgeTextPositive: {
    color: COLORS.success,
  },
  changeBadgeTextNegative: {
    color: COLORS.error,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  modalHeaderCompact: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.primary,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    marginBottom: SPACING.sm,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
  },
  doneButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  workoutIconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutHeaderText: {
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
  modalScroll: {
    padding: SPACING.lg,
  },
  workoutSection: {
    marginBottom: SPACING.lg,
  },
  workoutSectionHeader: {
    marginBottom: SPACING.md,
  },
  workoutTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  workoutTypeBadgeText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: 4,
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  setValue: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text.primary,
  },

  // Weight Card
  weightCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  weightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  weightCardIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.tertiary.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightCardTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  weightCardContent: {
    gap: SPACING.xs,
  },
  weightCardValue: {
    ...TYPOGRAPHY.statMedium,
    fontSize: 28,
    color: COLORS.text.primary,
  },
  weightCardProgress: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  weightProgressBarSmall: {
    height: 6,
    backgroundColor: COLORS.surface.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  weightProgressFillSmall: {
    height: '100%',
    backgroundColor: COLORS.tertiary.primary,
    borderRadius: RADIUS.full,
  },
  weightProgressComplete: {
    backgroundColor: COLORS.success,
  },
  weightCardGoal: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  weightCardHint: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.tertiary.primary,
    marginTop: SPACING.xs,
  },
  weightCardEmpty: {
    gap: SPACING.xs,
  },
  weightCardEmptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
});
