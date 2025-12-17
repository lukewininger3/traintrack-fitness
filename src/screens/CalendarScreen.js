import { Activity, Bike, Calendar, ChevronLeft, ChevronRight, Dumbbell, Flame } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal
} from 'react-native';
import { calculateWeekStreak } from '../utils/calculations';
import { getTodayString, loadWorkouts } from '../utils/storage';

const { width } = Dimensions.get('window');

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
    return new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const calendar = [];
    let week = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const today = getTodayString();
      
      week.push({
        day,
        date: dateStr,
        hasWorkout: dayWorkouts.length > 0,
        workoutType: dayWorkouts[0]?.type,
        isToday: dateStr === today
      });
      
      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
    }
    
    while (week.length > 0 && week.length < 7) {
      week.push(null);
    }
    if (week.length > 0) {
      calendar.push(week);
    }
    
    return calendar;
  }, [calendarMonth, calendarYear, workouts]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Calendar Card */}
        <View style={styles.card}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <Pressable onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.monthText}>{getCurrentMonthName()}</Text>
            <Pressable onPress={nextMonth} style={styles.navButton}>
              <ChevronRight size={24} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid with Week Streaks */}
          {calendarData.map((week, weekIdx) => {
            const hasWorkoutThisWeek = week.some(day => day?.hasWorkout);
            const isFutureWeek = week.every(day => !day || day.date > getTodayString());
            const today = getTodayString();
            const isCurrentWeek = week.some(day => day?.date === today);
            const showStreak = isCurrentWeek && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();

            return (
              <View key={weekIdx} style={styles.weekRow}>
                {/* Calendar Days */}
                <View style={styles.daysRow}>
                  {week.map((day, dayIdx) => {
                    const Icon = day?.hasWorkout ? getWorkoutIcon(day.workoutType) : null;
                    const isFutureDay = day && day.date > today;

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
                          !day?.hasWorkout && !day?.isToday && !isFutureDay && styles.dayPast,
                          isFutureDay && styles.dayFuture
                        ]}
                      >
                        {day?.hasWorkout && Icon ? (
                          <Icon size={20} color={day.isToday ? "#fff" : "#1F2937"} strokeWidth={2.5} />
                        ) : (
                          <Text style={[
                            styles.dayText,
                            day?.isToday && styles.dayTextToday,
                            !day?.hasWorkout && !isFutureDay && styles.dayTextPast,
                            isFutureDay && styles.dayTextFuture
                          ]}>
                            {day?.day}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Week Streak Circle */}
                <View style={styles.weekIndicator}>
                  {showStreak ? (
                    <View style={styles.fireContainer}>
                      <Flame size={32} color="#FACC15" fill="#FACC15" strokeWidth={2.5} />
                    </View>
                  ) : (
                    <View style={[
                      styles.weekCircle,
                      hasWorkoutThisWeek && !isFutureWeek && styles.weekCircleFilled
                    ]} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Flame size={24} color="#FACC15" />
            <Text style={styles.statValue}>{weekStreak}</Text>
            <Text style={styles.statLabel}>Week Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Calendar size={24} color="#9CA3AF" />
            <Text style={styles.statValue}>{workouts.length}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
        </View>
      </View>

      {/* Workout Detail Modal (View Only) */}
      {selectedWorkout && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedWorkout(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                {React.createElement(getWorkoutIcon(selectedWorkout.type), {
                  size: 28,
                  color: '#1F2937',
                  strokeWidth: 2
                })}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedWorkout.date} • {selectedWorkout.type}</Text>
              </View>
              <Pressable
                onPress={() => setSelectedWorkout(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedWorkout.exercises?.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.sets?.map((set, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {setIdx + 1}</Text>
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
    backgroundColor: '#1F2937',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
    paddingVertical: 4,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginHorizontal: 2,
  },
  dayInvisible: {
    opacity: 0,
  },
  dayToday: {
    backgroundColor: '#111827',
  },
  dayWithWorkout: {
    backgroundColor: '#fff',
  },
  dayPast: {
    backgroundColor: '#4B5563',
  },
  dayFuture: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dayTextToday: {
    color: '#fff',
  },
  dayTextPast: {
    color: '#fff',
  },
  dayTextFuture: {
    color: '#fff',
  },
  weekIndicator: {
    width: 32,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  weekCircleFilled: {
    backgroundColor: '#FACC15',
    borderWidth: 0,
  },
  fireContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireNumber: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalScroll: {
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  setValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
