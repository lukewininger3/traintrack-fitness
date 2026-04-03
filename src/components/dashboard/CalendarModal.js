import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Activity,
  Bike,
  Waves,
  Flame,
} from 'lucide-react-native';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';
import { useTheme } from '../../contexts/ThemeContext';
import { getTodayString } from '../../utils/storage';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - SPACING.lg * 4 - 52 - 14) / 7;
const DAY_HEIGHT = DAY_WIDTH + 4;

const getWorkoutIcon = (type) => {
  const icons = {
    'Strength': Dumbbell,
    'Running': Activity,
    'Cycling': Bike,
    'Swimming': Waves,
    'Other': Activity,
  };
  return icons[type] || Activity;
};

/**
 * CalendarModal - Full calendar view with workout details
 * @param {boolean} visible - Modal visibility
 * @param {Function} onClose - Close modal callback
 * @param {Array} workouts - All workouts data
 * @param {number} weekStreak - Current week streak
 */
export default function CalendarModal({ visible, onClose, workouts = [], weekStreak = 0 }) {
  const { colors: themeColors } = useTheme();

  const getWorkoutColor = (type) => {
    return themeColors.workoutTypes[type] || themeColors.text.tertiary;
  };
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedWorkouts, setSelectedWorkouts] = useState(null);

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
      year: 'numeric',
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
        isToday: dateStr === today,
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
      // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
      const d = new Date(w.date + 'T12:00:00');
      return d >= firstDay && d <= lastDay;
    }).length;
  }, [workouts, calendarMonth, calendarYear]);

  const today = getTodayString();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.background.primary }]}>
        <View style={[styles.modalHeader, { backgroundColor: themeColors.background.primary }]}>
          <View style={[styles.modalHandle, { backgroundColor: themeColors.surface.border }]} />
          <Pressable onPress={onClose} style={styles.doneButton}>
            <Text style={[styles.doneButtonText, { color: themeColors.accent.primary }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Calendar */}
          <View style={[styles.calendarCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            {/* Month Nav */}
            <View style={styles.monthNav}>
              <Pressable onPress={previousMonth} style={[styles.navButton, { backgroundColor: themeColors.background.elevated }]}>
                <ChevronLeft size={20} color={themeColors.text.primary} strokeWidth={2.5} />
              </Pressable>

              <View style={styles.monthCenter}>
                <Text style={[styles.monthText, { color: themeColors.text.primary }]}>{getCurrentMonthName()}</Text>
                <Text style={[styles.monthCount, { color: themeColors.text.tertiary }]}>{monthWorkoutCount} workouts</Text>
              </View>

              <Pressable onPress={nextMonth} style={[styles.navButton, { backgroundColor: themeColors.background.elevated }]}>
                <ChevronRight size={20} color={themeColors.text.primary} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.dayHeader, { color: themeColors.text.tertiary }]}>{day}</Text>
              ))}
              <View style={styles.weekHeaderSpacer} />
            </View>

            {/* Calendar Grid */}
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
                              <>
                                <View style={styles.workoutIconCenter}>
                                  {React.createElement(getWorkoutIcon(workoutTypes[0]), {
                                    size: 18,
                                    color: day?.isToday ? themeColors.text.inverse : primaryColor,
                                    strokeWidth: 2.5,
                                  })}
                                </View>
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
                                            { backgroundColor: getWorkoutColor(w.type) },
                                          ]}
                                        />
                                      ))}
                                  </View>
                                )}
                              </>
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
                      <View style={styles.fireStreakContainer}>
                        <Flame
                          size={32}
                          color={themeColors.warning}
                          fill={themeColors.warning}
                          strokeWidth={1.5}
                        />
                        <Text style={styles.fireStreakNumber}>{weekStreak}</Text>
                      </View>
                    ) : hasWorkoutThisWeek ? (
                      <View style={[styles.weekCircleFilled, { backgroundColor: themeColors.accent.primary }]} />
                    ) : (
                      <View style={[styles.weekCircle, { borderColor: themeColors.surface.border }]} />
                    )}
                  </View>
                </View>
              );
            })}

            {/* Legend */}
            <View style={[styles.legend, { borderTopColor: themeColors.surface.border }]}>
              {Object.entries(themeColors.workoutTypes)
                .filter(([type]) => type !== 'Other')
                .map(([type, color]) => (
                  <View key={type} style={styles.legendItem}>
                    {React.createElement(getWorkoutIcon(type), {
                      size: 12,
                      color: color,
                      strokeWidth: 2.5,
                    })}
                    <Text style={[styles.legendText, { color: themeColors.text.tertiary }]}>{type}</Text>
                  </View>
                ))}
            </View>
          </View>
        </ScrollView>

        {/* Workout Detail Sub-Modal */}
        {selectedWorkouts && selectedWorkouts.length > 0 && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedWorkouts(null)}
          >
            <View style={[styles.modalContainer, { backgroundColor: themeColors.background.primary }]}>
              <View style={[styles.modalHeader, { backgroundColor: themeColors.background.primary }]}>
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
                          strokeWidth: 2.5,
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
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
  },
  doneButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  calendarCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthText: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    letterSpacing: 1,
  },
  monthCount: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
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
  dayText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
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
  },
  weekCircleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  workoutSection: {
    marginBottom: SPACING.lg,
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
  },
  workoutMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  exerciseCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: 4,
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
  },
  setValue: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
  },
});
