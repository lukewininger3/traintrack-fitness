import { Calendar, Check, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, Dumbbell, Activity, Bike, Waves, Flame, Play, RotateCcw, Scale, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { calculateWeekStreak } from '../utils/calculations';
import { getTodayString, loadWorkouts, loadInProgressWorkout, clearInProgressWorkout } from '../utils/storage';
import { loadWeeklyGoals, getWeekStart, getDateFromDayOfWeek } from '../utils/goalsStorage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - SPACING.lg * 2 - SPACING.lg * 2 - 52 - 14) / 7;
const DAY_HEIGHT = DAY_WIDTH + 4;

export default function DashboardScreen({ navigation }) {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const [workouts, setWorkouts] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [weekStreak, setWeekStreak] = useState(0);
  const [selectedWorkouts, setSelectedWorkouts] = useState(null);
  const [todayPlannedWorkouts, setTodayPlannedWorkouts] = useState([]);
  const [inProgressWorkout, setInProgressWorkout] = useState(null);

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

    // Check for in-progress workout
    const savedWorkout = await loadInProgressWorkout();
    setInProgressWorkout(savedWorkout);
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
    return themeColors.workoutTypes[type] || themeColors.text.tertiary;
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

  // Continue an in-progress workout
  const continueWorkout = () => {
    if (!inProgressWorkout) return;

    const { workout, editingWorkoutId, isEditing } = inProgressWorkout;

    // Navigate to workout builder with the saved state
    const workoutDetails = {
      name: workout.name,
      type: workout.type,
      date: workout.date,
      time: workout.time,
      notes: workout.notes,
      existingExercises: workout.exercises || [],
    };

    router.push({
      pathname: '/workout-builder',
      params: {
        editingWorkoutId: isEditing ? editingWorkoutId : undefined,
        workoutDetails: JSON.stringify(workoutDetails),
      },
    });
  };

  // Discard an in-progress workout
  const discardInProgressWorkout = () => {
    Alert.alert(
      'Discard Workout?',
      'This will delete your unsaved workout progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await clearInProgressWorkout();
            setInProgressWorkout(null);
          },
        },
      ]
    );
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
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background.primary }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Calendar Card */}
        <View style={[styles.calendarCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          {/* Month Nav with Week Streak */}
          <View style={styles.monthNav}>
            <Pressable onPress={previousMonth} style={[styles.navButton, { backgroundColor: themeColors.background.elevated }]}>
              <ChevronLeft size={20} color={themeColors.text.primary} strokeWidth={2.5} />
            </Pressable>

            <View style={styles.monthCenter}>
              <Text style={[styles.monthText, { color: themeColors.text.primary }]}>{getCurrentMonthName()}</Text>
            </View>

            <Pressable onPress={nextMonth} style={[styles.navButton, { backgroundColor: themeColors.background.elevated }]}>
              <ChevronRight size={20} color={themeColors.text.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.dayHeader, { color: themeColors.text.tertiary }]}>{day}</Text>
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
                          day?.isToday && { backgroundColor: themeColors.accent.primary },
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
                                color: day?.isToday ? themeColors.text.inverse : primaryColor,
                                strokeWidth: 2.5
                              })}
                            </View>
                          ) : (
                            <Text style={[
                              styles.dayText,
                              { color: themeColors.text.secondary },
                              day?.isToday && { color: themeColors.text.inverse, fontWeight: '700' },
                              isFutureDay && { color: themeColors.text.tertiary },
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
                    <View style={[styles.streakBadge, { backgroundColor: themeColors.streakDim, borderColor: themeColors.streak }]}>
                      <Flame
                        size={14}
                        color={themeColors.streak}
                        strokeWidth={2.5}
                      />
                      <Text style={[styles.streakBadgeNumber, { color: themeColors.streak }]}>{weekStreak}</Text>
                    </View>
                  ) : hasWorkoutThisWeek ? (
                    <View style={[styles.weekCircleFilled, { backgroundColor: themeColors.streak }]} />
                  ) : (
                    <View style={[styles.weekCircle, { borderColor: themeColors.surface.border }]} />
                  )}
                </View>
              </View>
            );
          })}

          {/* Legend */}
          {/* Monthly Stats Footer */}
          {!viewedMonthStats.isFuture && (
            <View style={[styles.calendarFooter, { borderTopColor: themeColors.surface.border }]}>
              <View style={styles.calendarStats}>
                <Text style={[styles.calendarStatsNumber, { color: themeColors.text.primary }]}>{viewedMonthStats.totalWorkouts}</Text>
                <Text style={[styles.calendarStatsLabel, { color: themeColors.text.tertiary }]}>workouts</Text>
              </View>
              <View style={[styles.calendarStatsDivider, { backgroundColor: themeColors.surface.border }]} />
              <View style={[
                styles.calendarChangeBadge,
                { backgroundColor: isPositiveChange ? themeColors.successDim : themeColors.errorDim }
              ]}>
                <Text style={[
                  styles.calendarChangeBadgeText,
                  { color: isPositiveChange ? themeColors.success : themeColors.error }
                ]}>
                  {isPositiveChange ? '+' : ''}{viewedMonthStats.change} vs last month
                </Text>
              </View>
            </View>
          )}

          <View style={styles.legend}>
            {Object.entries(themeColors.workoutTypes)
              .filter(([type]) => type !== 'Other')
              .map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  {React.createElement(getWorkoutIcon(type), {
                    size: 12,
                    color: color,
                    strokeWidth: 2.5
                  })}
                  <Text style={[styles.legendText, { color: themeColors.text.tertiary }]}>{type}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Continue Workout Card - shows when there's an unsaved workout */}
        {inProgressWorkout && (
          <View style={[styles.continueWorkoutCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <View style={styles.continueWorkoutHeader}>
              <View style={[styles.continueWorkoutIcon, { backgroundColor: themeColors.background.elevated }]}>
                <RotateCcw size={18} color={themeColors.text.secondary} strokeWidth={2.5} />
              </View>
              <View style={styles.continueWorkoutInfo}>
                <Text style={[styles.continueWorkoutTitle, { color: themeColors.text.secondary }]}>CONTINUE WORKOUT</Text>
                <Text style={[styles.continueWorkoutSubtitle, { color: themeColors.text.secondary }]}>
                  {inProgressWorkout.workout?.name || 'Untitled workout'}
                  {inProgressWorkout.workout?.exercises?.length > 0 &&
                    ` • ${inProgressWorkout.workout.exercises.length} exercise${inProgressWorkout.workout.exercises.length !== 1 ? 's' : ''}`
                  }
                </Text>
              </View>
              <Pressable
                onPress={discardInProgressWorkout}
                style={[styles.discardButton, { backgroundColor: themeColors.background.elevated }]}
                hitSlop={8}
              >
                <X size={18} color={themeColors.text.tertiary} strokeWidth={2} />
              </Pressable>
            </View>
            <Pressable style={[styles.continueButton, { backgroundColor: themeColors.accent.primary }]} onPress={continueWorkout}>
              <Text style={[styles.continueButtonText, { color: themeColors.text.inverse }]}>Continue</Text>
              <ArrowRight size={16} color={themeColors.text.inverse} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}

        {/* Today's Workout Card */}
        {todayPlannedWorkouts.length > 0 ? (
          <View style={[styles.todayWorkoutCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.borderAccent }]}>
            <View style={styles.todayWorkoutHeader}>
              <View style={[styles.todayWorkoutIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
                <Play size={18} color={themeColors.accent.primary} strokeWidth={2.5} fill={themeColors.accent.primary} />
              </View>
              <Text style={[styles.todayWorkoutTitle, { color: themeColors.accent.primary }]}>TODAY'S WORKOUT</Text>
            </View>

            {todayPlannedWorkouts.map((workout, index) => (
              <Pressable
                key={workout.id}
                style={[styles.todayWorkoutItem, { backgroundColor: themeColors.background.elevated }]}
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
                    <Text style={[styles.todayWorkoutName, { color: themeColors.text.primary }]}>{workout.name}</Text>
                    <Text style={[styles.todayWorkoutMeta, { color: themeColors.text.tertiary }]}>
                      {workout.workoutType}
                      {workout.exercises?.length > 0 && ` • ${workout.exercises.length} exercises`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.startWorkoutButton, { backgroundColor: themeColors.accent.primaryDim }]}>
                  <Text style={[styles.startWorkoutText, { color: themeColors.accent.primary }]}>Start</Text>
                  <ArrowRight size={16} color={themeColors.accent.primary} strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            style={[styles.noWorkoutCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.borderAccent }]}
            onPress={() => router.push('/(tabs)/goals')}
          >
            <View style={styles.noWorkoutContent}>
              <View style={[styles.noWorkoutIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
                <Calendar size={22} color={themeColors.accent.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.noWorkoutText}>
                <Text style={[styles.noWorkoutTitle, { color: themeColors.text.secondary }]}>No workout planned today</Text>
                <Text style={[styles.noWorkoutHint, { color: themeColors.accent.primary }]}>Tap to plan your workout</Text>
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
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background.elevated }]} edges={['top', 'bottom']}>
            <View style={[styles.modalHeaderCompact, { backgroundColor: themeColors.background.primary }]}>
              <View style={[styles.modalHandle, { backgroundColor: themeColors.surface.border }]} />
              <Pressable
                onPress={() => setSelectedWorkouts(null)}
                style={styles.doneButton}
              >
                <Text style={[styles.doneButtonText, { color: themeColors.accent.primary }]}>Done</Text>
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
                      <Text style={[styles.workoutName, { color: themeColors.text.primary }]}>{workout.name}</Text>
                      <Text style={[styles.workoutMeta, { color: themeColors.text.secondary }]}>{workout.type} • {workout.date}</Text>
                    </View>
                  </View>
                  {workout.exercises?.map((exercise, idx) => (
                    <View key={idx} style={[styles.exerciseCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                      <Text style={[styles.exerciseName, { color: themeColors.text.primary }]}>{exercise.name}</Text>
                      {exercise.sets?.map((set, setIdx) => (
                        <View key={setIdx} style={[styles.setRow, { backgroundColor: themeColors.background.elevated }]}>
                          <Text style={[styles.setLabel, { color: themeColors.text.tertiary }]}>SET {setIdx + 1}</Text>
                          <Text style={[styles.setValue, { color: themeColors.text.primary }]}>
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
          </SafeAreaView>
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
    backgroundColor: COLORS.successDim,
  },
  calendarChangeBadgeNegative: {
    backgroundColor: COLORS.errorDim,
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
    backgroundColor: COLORS.background.elevated,
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

  // Continue Workout Card
  continueWorkoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.secondary.primary,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  continueWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  continueWorkoutIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueWorkoutInfo: {
    flex: 1,
  },
  continueWorkoutTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.secondary.primary,
    fontSize: 11,
  },
  continueWorkoutSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  discardButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.secondary.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  continueButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
});
