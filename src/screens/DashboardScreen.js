import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight, Dumbbell, Activity, Bike, Waves, Flame, Play } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
import { loadWeeklyGoals, getWeekStart, getDateFromDayOfWeek } from '../utils/goalsStorage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - SPACING.lg * 2 - SPACING.lg * 2 - 52 - 14) / 7;
const DAY_HEIGHT = DAY_WIDTH + 4;

export default function DashboardScreen({ navigation }) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [weekStreak, setWeekStreak] = useState(0);
  const [selectedWorkouts, setSelectedWorkouts] = useState(null);
  const [todayPlannedWorkouts, setTodayPlannedWorkouts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        loadData();
      }, 50);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadData = async () => {
    // Only load last 6 months of workouts to reduce memory usage
    const data = await loadWorkouts({ silent: true, maxMonths: 6 });
    setWorkouts(data || []);
    setWeekStreak(calculateWeekStreak(data || []));

    // Load today's planned workouts
    const weekStart = getWeekStart();
    const goals = await loadWeeklyGoals(weekStart);
    if (goals?.plannedWorkouts) {
      const todayDayOfWeek = new Date().getDay();
      const todayWorkouts = goals.plannedWorkouts.filter(p =>
        p.dayOfWeek === todayDayOfWeek && !p.completed
      );
      setTodayPlannedWorkouts(todayWorkouts);
    } else {
      setTodayPlannedWorkouts([]);
    }
  };

  // Calculate stats for the viewed calendar month
  const viewedMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Check if viewing a future month
    const isFutureMonth = calendarYear > currentYear ||
      (calendarYear === currentYear && calendarMonth > currentMonth);

    if (isFutureMonth) {
      return { isFuture: true, totalWorkouts: 0, change: 0 };
    }

    const firstDayViewedMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayViewedMonth = new Date(calendarYear, calendarMonth + 1, 0);
    const prevMonthFirst = new Date(calendarYear, calendarMonth - 1, 1);
    const prevMonthLast = new Date(calendarYear, calendarMonth, 0);

    const viewedMonthWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= firstDayViewedMonth && workoutDate <= lastDayViewedMonth;
    });

    const prevMonthWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= prevMonthFirst && workoutDate <= prevMonthLast;
    });

    return {
      isFuture: false,
      totalWorkouts: viewedMonthWorkouts.length,
      change: viewedMonthWorkouts.length - prevMonthWorkouts.length
    };
  }, [workouts, calendarMonth, calendarYear]);

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

  // Start a planned workout - navigate to workout builder with planned data
  const startPlannedWorkout = (plannedWorkout) => {
    const today = getTodayString();
    const workoutDetails = {
      name: plannedWorkout.name,
      type: plannedWorkout.workoutType,
      date: today,
      plannedExercises: plannedWorkout.exercises || [],
      plannedWorkoutId: plannedWorkout.id,
    };

    router.push({
      pathname: '/workout-details',
      params: {
        workoutDetails: JSON.stringify(workoutDetails),
      },
    });
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

  const isPositiveChange = viewedMonthStats.change >= 0;

  const today = getTodayString();

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
            const isCurrentWeek = week.some(day => day?.date === today);

            return (
              <View key={weekIdx} style={styles.weekRow}>
                <View style={styles.daysRow}>
                  {week.map((day, dayIdx) => {
                    const isFutureDay = day && day.date > today;
                    const workoutTypes = day?.workoutTypes || [];
                    const primaryColor = workoutTypes.length > 0 ? getWorkoutColor(workoutTypes[0]) : null;
                    const workoutCount = day?.workoutCount || 0;

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
                        <View style={[
                          styles.dayInner,
                          day?.isToday && styles.dayToday,
                          day?.hasWorkout && !day?.isToday && {
                            backgroundColor: primaryColor + '20',
                            borderWidth: 1.5,
                            borderColor: primaryColor + '40',
                          },
                        ]}>
                          {day?.hasWorkout ? (
                            <View style={styles.workoutIconCenter}>
                              {React.createElement(getWorkoutIcon(workoutTypes[0]), {
                                size: 18,
                                color: day?.isToday ? COLORS.text.inverse : primaryColor,
                                strokeWidth: 2.5
                              })}
                            </View>
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

                {/* Week Indicator */}
                <View style={styles.weekIndicator}>
                  {isCurrentWeek && weekStreak > 0 ? (
                    <View style={styles.streakBadge}>
                      <Flame
                        size={14}
                        color={COLORS.secondary.primary}
                        strokeWidth={2.5}
                      />
                      <Text style={styles.streakBadgeNumber}>{weekStreak}</Text>
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

          {/* Legend */}
          {/* Monthly Stats Footer */}
          {!viewedMonthStats.isFuture && (
            <View style={styles.calendarFooter}>
              <View style={styles.calendarStats}>
                <Text style={styles.calendarStatsNumber}>{viewedMonthStats.totalWorkouts}</Text>
                <Text style={styles.calendarStatsLabel}>workouts</Text>
              </View>
              <View style={styles.calendarStatsDivider} />
              <View style={[
                styles.calendarChangeBadge,
                isPositiveChange ? styles.calendarChangeBadgePositive : styles.calendarChangeBadgeNegative
              ]}>
                <Text style={[
                  styles.calendarChangeBadgeText,
                  isPositiveChange ? styles.calendarChangeBadgeTextPositive : styles.calendarChangeBadgeTextNegative
                ]}>
                  {isPositiveChange ? '+' : ''}{viewedMonthStats.change} vs last month
                </Text>
              </View>
            </View>
          )}

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

        {/* Today's Workout Card */}
        {todayPlannedWorkouts.length > 0 ? (
          <View style={styles.todayWorkoutCard}>
            <View style={styles.todayWorkoutHeader}>
              <View style={styles.todayWorkoutIcon}>
                <Play size={18} color={COLORS.accent.primary} strokeWidth={2.5} fill={COLORS.accent.primary} />
              </View>
              <Text style={styles.todayWorkoutTitle}>TODAY'S WORKOUT</Text>
            </View>

            {todayPlannedWorkouts.map((workout, index) => (
              <Pressable
                key={workout.id}
                style={styles.todayWorkoutItem}
                onPress={() => startPlannedWorkout(workout)}
              >
                <View style={styles.todayWorkoutInfo}>
                  <View style={[styles.todayWorkoutTypeBadge, { backgroundColor: getWorkoutColor(workout.workoutType) + '20' }]}>
                    {React.createElement(getWorkoutIcon(workout.workoutType), {
                      size: 16,
                      color: getWorkoutColor(workout.workoutType),
                      strokeWidth: 2.5
                    })}
                  </View>
                  <View style={styles.todayWorkoutDetails}>
                    <Text style={styles.todayWorkoutName}>{workout.name}</Text>
                    <Text style={styles.todayWorkoutMeta}>
                      {workout.workoutType}
                      {workout.exercises?.length > 0 && ` • ${workout.exercises.length} exercises`}
                    </Text>
                  </View>
                </View>
                <View style={styles.startWorkoutButton}>
                  <Text style={styles.startWorkoutText}>Start</Text>
                  <ArrowRight size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            style={styles.noWorkoutCard}
            onPress={() => router.push('/(tabs)/goals')}
          >
            <View style={styles.noWorkoutContent}>
              <View style={styles.noWorkoutIcon}>
                <Dumbbell size={24} color={COLORS.text.tertiary} strokeWidth={2} />
              </View>
              <View style={styles.noWorkoutText}>
                <Text style={styles.noWorkoutTitle}>No workout planned today</Text>
                <Text style={styles.noWorkoutHint}>Tap to plan your workouts →</Text>
              </View>
            </View>
          </Pressable>
        )}
      </View>

      {/* Workout Detail Modal */}
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
  section: {
    marginBottom: SPACING.lg,
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
  workoutIconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    backgroundColor: COLORS.secondary.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.secondary.dim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: COLORS.secondary.primary,
  },
  streakBadgeNumber: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary.primary,
  },

  // Calendar Footer Stats
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    gap: SPACING.sm,
  },
  calendarStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  calendarStatsNumber: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
    color: COLORS.text.primary,
  },
  calendarStatsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  calendarStatsDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.xs,
  },
  calendarChangeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  calendarChangeBadgePositive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  calendarChangeBadgeNegative: {
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
  },
  calendarChangeBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  calendarChangeBadgeTextPositive: {
    color: COLORS.success,
  },
  calendarChangeBadgeTextNegative: {
    color: COLORS.error,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.text.tertiary,
  },

  // Today's Workout Card
  todayWorkoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  todayWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  todayWorkoutIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayWorkoutTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent.primary,
  },
  todayWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  todayWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  todayWorkoutTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayWorkoutDetails: {
    flex: 1,
  },
  todayWorkoutName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  todayWorkoutMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent.primaryDim,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  startWorkoutText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.accent.primary,
  },

  // No Workout Card
  noWorkoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  noWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  noWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWorkoutText: {
    flex: 1,
  },
  noWorkoutTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  noWorkoutHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    marginTop: SPACING.xs,
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
});
