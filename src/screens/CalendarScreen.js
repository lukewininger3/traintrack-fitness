import { Activity, Bike, ChevronLeft, ChevronRight, Dumbbell, Flame, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { calculateWeekStreak } from '../utils/calculations';
import { getTodayString, loadWorkouts } from '../utils/storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';

const { width } = Dimensions.get('window');
// Calculate day size: screen width - container padding (lg*2) - calendar card padding (lg*2) - week indicator space (48) - day margins (14)
const DAY_SIZE = (width - SPACING.lg * 2 - SPACING.lg * 2 - 48 - 14) / 7;

export default function CalendarScreen({ navigation }) {
  const [workouts, setWorkouts] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [weekStreak, setWeekStreak] = useState(0);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts();
    setWorkouts(data);
    setWeekStreak(calculateWeekStreak(data));
  };

  const getWorkoutIcon = (type) => {
    const icons = {
      'Strength': Dumbbell,
      'Running': Activity,
      'Cycling': Bike,
      'Swimming': Activity,
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

  // Helper to check if a date has a workout
  const dateHasWorkout = (dateStr) => {
    return workouts.some(w => w.date === dateStr);
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

    // Check if first week has workouts in previous month
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

      week.push({
        day,
        date: dateStr,
        hasWorkout: dayWorkouts.length > 0,
        workoutType: dayWorkouts[0]?.type,
        isToday: dateStr === today
      });

      if (week.length === 7) {
        // Add metadata about adjacent month workouts for this week
        week.adjacentMonthHasWorkout = weekHasWorkoutInAdjacentMonth;
        calendar.push(week);
        week = [];
        weekHasWorkoutInAdjacentMonth = false;
      }
    }

    // Handle last partial week - check for workouts in next month
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Hero Stats Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroStatLarge}>
            <View style={styles.streakContainer}>
              <Flame size={28} color={COLORS.accent.primary} strokeWidth={2.5} />
              <Text style={styles.heroNumber}>{weekStreak}</Text>
            </View>
            <Text style={styles.heroLabel}>WEEK STREAK</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatLarge}>
            <View style={styles.streakContainer}>
              <Zap size={28} color={COLORS.tertiary.primary} strokeWidth={2.5} />
              <Text style={styles.heroNumber}>{workouts.length}</Text>
            </View>
            <Text style={styles.heroLabel}>TOTAL WORKOUTS</Text>
          </View>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <Pressable onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.monthTitleContainer}>
              <Text style={styles.monthText}>{getCurrentMonthName()}</Text>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{monthWorkoutCount}</Text>
              </View>
            </View>
            <Pressable onPress={nextMonth} style={styles.navButton}>
              <ChevronRight size={24} color={COLORS.text.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.dayHeader}>{day}</Text>
            ))}
            <View style={styles.weekHeaderSpacer} />
          </View>

          {/* Calendar Grid */}
          {calendarData.map((week, weekIdx) => {
            const hasWorkoutInVisibleDays = week.some(day => day?.hasWorkout);
            const hasWorkoutThisWeek = hasWorkoutInVisibleDays || week.adjacentMonthHasWorkout;
            const today = getTodayString();
            const isCurrentWeek = week.some(day => day?.date === today);

            return (
              <View key={weekIdx} style={styles.weekRow}>
                {/* Calendar Days */}
                <View style={styles.daysRow}>
                  {week.map((day, dayIdx) => {
                    const Icon = day?.hasWorkout ? getWorkoutIcon(day.workoutType) : null;
                    const isFutureDay = day && day.date > today;
                    const workoutColor = day?.hasWorkout ? getWorkoutColor(day.workoutType) : null;

                    return (
                      <Pressable
                        key={dayIdx}
                        disabled={!day}
                        onPress={() => {
                          if (day?.hasWorkout) {
                            const dayWorkouts = workouts.filter(w => w.date === day.date);
                            if (dayWorkouts.length > 0) {
                              setSelectedWorkout(dayWorkouts[0]);
                            }
                          }
                        }}
                        style={[
                          styles.dayButton,
                          !day && styles.dayInvisible,
                          day?.isToday && styles.dayToday,
                          day?.hasWorkout && !day?.isToday && styles.dayWithWorkout,
                        ]}
                      >
                        {day?.hasWorkout && Icon ? (
                          <View style={[styles.workoutIconBg, { backgroundColor: workoutColor + '20' }]}>
                            <Icon size={16} color={workoutColor} strokeWidth={2.5} />
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
                      </Pressable>
                    );
                  })}
                </View>

                {/* Week Indicator */}
                <View style={styles.weekIndicator}>
                  {isCurrentWeek && weekStreak > 0 ? (
                    <View style={styles.currentWeekIndicator}>
                      <Flame size={20} color={COLORS.accent.primary} fill={COLORS.accent.primary} strokeWidth={2} />
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
        </View>

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>WORKOUT TYPES</Text>
          <View style={styles.legendItems}>
            {Object.entries(COLORS.workoutTypes).map(([type, color]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{type}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedWorkout(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: getWorkoutColor(selectedWorkout.type) + '20' }]}>
                {React.createElement(getWorkoutIcon(selectedWorkout.type), {
                  size: 28,
                  color: getWorkoutColor(selectedWorkout.type),
                  strokeWidth: 2.5
                })}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedWorkout.date} • {selectedWorkout.type}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedWorkout(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedWorkout.exercises?.map((exercise, idx) => (
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

  // Hero Section
  heroSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  heroStatLarge: {
    flex: 1,
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroNumber: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
  },
  heroLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  heroDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.lg,
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
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  monthText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },
  monthBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  monthBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    fontWeight: '700',
  },

  // Day Headers
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  dayHeader: {
    width: DAY_SIZE,
    textAlign: 'center',
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginHorizontal: 1,
  },
  weekHeaderSpacer: {
    width: 36,
    marginLeft: SPACING.md,
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
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    marginHorizontal: 1,
  },
  dayInvisible: {
    opacity: 0,
  },
  dayToday: {
    backgroundColor: COLORS.accent.primary,
  },
  dayWithWorkout: {
    backgroundColor: 'transparent',
  },
  dayText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  dayTextToday: {
    color: COLORS.text.inverse,
  },
  dayTextFuture: {
    color: COLORS.text.tertiary,
  },
  dayTextPast: {
    color: COLORS.text.secondary,
  },
  workoutIconBg: {
    width: DAY_SIZE - 4,
    height: DAY_SIZE - 4,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week Indicator
  weekIndicator: {
    width: 36,
    marginLeft: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface.border,
  },
  weekCircleFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent.primary,
  },
  currentWeekIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legend
  legendCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  legendTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xxxl,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  closeButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  exerciseName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
  },
  setValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
});
