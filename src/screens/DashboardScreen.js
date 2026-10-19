import { Calendar, Camera, Check, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, Dumbbell, Activity, Bike, Waves, Flame, Play, RotateCcw, Scale, Target, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { getStreakInfo } from '../utils/calculations';
import { getTodayString, loadWorkouts, loadInProgressWorkout, clearInProgressWorkout } from '../utils/storage';
import { formatDateForStorage, getRelativeDateLabel } from '../utils/dateFormatter';
import { loadWeeklyGoals, getWeekStart, getWeekEnd, getDateFromDayOfWeek } from '../utils/goalsStorage';
import { loadWeightData, addWeightEntry } from '../utils/weightStorage';
import WeightDateSelect from '../components/weight/WeightDateSelect';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - SPACING.lg * 2 - SPACING.lg * 2 - 52 - 14) / 7;
const DAY_HEIGHT = DAY_WIDTH + 4;

export default function DashboardScreen({ navigation }) {
  const router = useRouter();
  const { colors: themeColors, isDark } = useTheme();
  // Read from the app's root provider: inside a full-screen modal SafeAreaView
  // doesn't see the status bar / home indicator insets
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [streakInfo, setStreakInfo] = useState({ streak: 0, currentWeekHasWorkout: false, streakWeekKey: null });
  const [selectedWorkouts, setSelectedWorkouts] = useState(null);
  const [todayPlannedWorkouts, setTodayPlannedWorkouts] = useState([]);
  const [inProgressWorkout, setInProgressWorkout] = useState(null);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [hasLoggedWeightToday, setHasLoggedWeightToday] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [weightMedia, setWeightMedia] = useState([]);
  const [weightDate, setWeightDate] = useState(new Date());
  const [showWeightDateWheels, setShowWeightDateWheels] = useState(false);
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);
  const [weightData, setWeightData] = useState({ entries: [], goal: null, settings: { unit: 'lbs' } });
  const [weightMediaViewer, setWeightMediaViewer] = useState(null);

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
    setStreakInfo(getStreakInfo(data || []));

    // Load today's planned workouts and weekly goals
    const weekStart = getWeekStart();
    const goalsData = await loadWeeklyGoals(weekStart);
    if (goalsData?.plannedWorkouts) {
      const todayDayOfWeek = new Date().getDay();
      const todayWorkouts = goalsData.plannedWorkouts.filter(p =>
        p.dayOfWeek === todayDayOfWeek && !p.completed
      );
      setTodayPlannedWorkouts(todayWorkouts);
    } else {
      setTodayPlannedWorkouts([]);
    }

    // Set weekly goals
    if (goalsData?.goals) {
      setWeeklyGoals(goalsData.goals);
    } else {
      setWeeklyGoals([]);
    }

    // Check for in-progress workout
    const savedWorkout = await loadInProgressWorkout();
    setInProgressWorkout(savedWorkout);

    // Load weight data
    const weightDataResult = await loadWeightData();
    setWeightData(weightDataResult);
    const today = getTodayString();
    const hasTodayWeight = weightDataResult.entries.some(e => e.date === today);
    setHasLoggedWeightToday(hasTodayWeight);
  };

  // Submit weight entry
  const submitWeight = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    // Validate reasonable weight range (supports lbs and kg)
    // Range: 20-1500 covers extreme cases in both units
    if (weight < 20 || weight > 1500) {
      Alert.alert(
        'Check Your Entry',
        `${weight} ${weightData.settings?.unit || 'lbs'} seems unusual. Please verify and try again.`
      );
      return;
    }

    setIsSubmittingWeight(true);
    const result = await addWeightEntry(weight, weightNotes, weightDate, weightMedia);
    setIsSubmittingWeight(false);

    if (result.success) {
      setShowWeightModal(false);
      // Only set hasLoggedWeightToday if the logged date is actually today
      const today = getTodayString();
      const loggedDateStr = `${weightDate.getFullYear()}-${String(weightDate.getMonth() + 1).padStart(2, '0')}-${String(weightDate.getDate()).padStart(2, '0')}`;
      if (loggedDateStr === today) {
        setHasLoggedWeightToday(true);
      }
      setWeightInput('');
      setWeightNotes('');
      setWeightMedia([]);
      setWeightDate(new Date());
      // Reload weight data
      const newWeightData = await loadWeightData();
      setWeightData(newWeightData);
    } else {
      Alert.alert('Error', 'Failed to save weight. Please try again.');
    }
  };

  // Add photo to weight entry
  const handleAddWeightPhoto = async () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              setWeightMedia(prev => [...prev, {
                uri: asset.uri,
                type: 'image',
                id: Date.now().toString(),
              }]);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              setWeightMedia(prev => [...prev, {
                uri: asset.uri,
                type: 'image',
                id: Date.now().toString(),
              }]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const weightDateLogged = weightData.entries.some(e => e.date === formatDateForStorage(weightDate));

  // Picking a logged day loads it for editing; picking an unlogged day after a
  // logged one clears the form (a weight typed for a new day is kept)
  const changeWeightDate = (d) => {
    const entryFor = (date) => weightData.entries.find(e => e.date === formatDateForStorage(date));
    const next = entryFor(d);
    const previous = entryFor(weightDate);
    setWeightDate(d);
    if (next) {
      setWeightInput(next.weight.toFixed(1));
      setWeightNotes(next.notes || '');
      setWeightMedia(next.media || []);
    } else if (previous) {
      setWeightInput('');
      setWeightNotes('');
      setWeightMedia([]);
    }
  };

  const handleRemoveWeightPhoto = (mediaId) => {
    setWeightMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  // Calculate stats for the viewed calendar month
  const viewedMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Check if viewing a future month
    const isFutureMonth = calendarYear > currentYear ||
      (calendarYear === currentYear && calendarMonth > currentMonth);

    if (isFutureMonth) {
      return { isFuture: true, totalWorkouts: 0, change: 0 };
    }

    // Determine the comparison day - for current month use today, for past months use end of month
    const isCurrentMonth = calendarYear === currentYear && calendarMonth === currentMonth;
    const comparisonDay = isCurrentMonth ? currentDay : new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const firstDayViewedMonth = new Date(calendarYear, calendarMonth, 1);
    const comparisonDateViewedMonth = new Date(calendarYear, calendarMonth, comparisonDay);

    // Previous month - compare to the same point in time
    const prevMonthFirst = new Date(calendarYear, calendarMonth - 1, 1);
    // Make sure we don't exceed the number of days in the previous month
    const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const prevMonthComparisonDay = Math.min(comparisonDay, prevMonthDays);
    const prevMonthComparisonDate = new Date(calendarYear, calendarMonth - 1, prevMonthComparisonDay);

    // Parse workout dates with timezone safety (add T12:00:00 to avoid UTC midnight issues)
    const parseWorkoutDate = (dateStr) => new Date(dateStr + 'T12:00:00');

    const viewedMonthWorkouts = workouts.filter(w => {
      const workoutDate = parseWorkoutDate(w.date);
      return workoutDate >= firstDayViewedMonth && workoutDate <= comparisonDateViewedMonth;
    });

    const prevMonthWorkouts = workouts.filter(w => {
      const workoutDate = parseWorkoutDate(w.date);
      return workoutDate >= prevMonthFirst && workoutDate <= prevMonthComparisonDate;
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

  // Get goal label for display
  const getGoalLabel = (goal) => {
    if (goal.type === 'count') {
      return 'Total Workouts';
    } else if (goal.type === 'type_count') {
      return `${goal.workoutType} Workouts`;
    } else if (goal.type === 'days') {
      return 'Active Days';
    }
    return 'Workouts';
  };

  // Memoize this week's workouts for goal progress calculations
  const thisWeekWorkouts = useMemo(() => {
    const weekStartStr = getWeekStart();
    const weekEndStr = getWeekEnd(weekStartStr);
    return workouts.filter(w => w.date >= weekStartStr && w.date <= weekEndStr);
  }, [workouts]);

  // Calculate progress for a goal based on this week's completed workouts
  const getGoalProgress = useCallback((goal) => {
    if (goal.type === 'count') {
      return thisWeekWorkouts.length;
    } else if (goal.type === 'type_count') {
      return thisWeekWorkouts.filter(w => w.type === goal.workoutType).length;
    } else if (goal.type === 'days') {
      const uniqueDays = new Set(thisWeekWorkouts.map(w => w.date));
      return uniqueDays.size;
    }
    return 0;
  }, [thisWeekWorkouts]);

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
    // Convert to Monday-first: Mon=0, Tue=1, ..., Sun=6
    const dayOfWeek = firstDay.getDay();
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
      // Get unique workout types directly from filtered workouts (avoids duplicate filter)
      const workoutTypes = [...new Set(dayWorkouts.map(w => w.type))];

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
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.dayHeader, { color: themeColors.text.tertiary }]}>{day}</Text>
            ))}
            <View style={styles.weekHeaderSpacer} />
          </View>

          {calendarData.map((week, weekIdx) => {
            const hasWorkoutInVisibleDays = week.some(day => day?.hasWorkout);
            const hasWorkoutThisWeek = hasWorkoutInVisibleDays || week.adjacentMonthHasWorkout;
            const isCurrentWeek = week.some(day => day?.date === today);

            // Get Monday of this week row to compare with streakWeekKey
            const firstVisibleDay = week.find(day => day !== null);
            let weekKey = null;
            if (firstVisibleDay) {
              const [year, month, dayNum] = firstVisibleDay.date.split('-').map(Number);
              const date = new Date(year, month - 1, dayNum);
              const dayOfWeek = date.getDay();
              const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const monday = new Date(date);
              monday.setDate(date.getDate() - daysSinceMonday);
              const mYear = monday.getFullYear();
              const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
              const mDay = String(monday.getDate()).padStart(2, '0');
              weekKey = `${mYear}-${mMonth}-${mDay}`;
            }

            // Determine if this week row should show the streak badge
            const isStreakWeek = streakInfo.streak > 0 && weekKey === streakInfo.streakWeekKey;

            // Show pending indicator on current week if streak is active but not extended yet
            const isStreakPending = isCurrentWeek && streakInfo.streak > 0 && !streakInfo.currentWeekHasWorkout;

            return (
              <View key={weekIdx} style={styles.weekRow}>
                <View style={styles.daysRow}>
                  {week.map((day, dayIdx) => {
                    const isFutureDay = day && day.date > today;
                    const workoutTypes = day?.workoutTypes || [];
                    const primaryColor = workoutTypes.length > 0 ? getWorkoutColor(workoutTypes[0]) : null;

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
                        accessibilityRole="button"
                        accessibilityLabel={day ? `${day.day}, ${day.hasWorkout ? 'has workout' : 'no workout'}${day.isToday ? ', today' : ''}` : undefined}
                        accessibilityHint={day?.hasWorkout ? 'Double tap to view workouts' : undefined}
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
                  {isStreakWeek ? (
                    <View style={[styles.streakBadge, { backgroundColor: themeColors.streakDim, borderColor: themeColors.streak }]}>
                      <Flame
                        size={14}
                        color={themeColors.streak}
                        strokeWidth={2.5}
                      />
                      <Text style={[styles.streakBadgeNumber, { color: themeColors.streak }]}>{streakInfo.streak}</Text>
                    </View>
                  ) : isStreakPending ? (
                    <View style={[styles.weekCirclePending, { borderColor: themeColors.streak }]} />
                  ) : hasWorkoutThisWeek ? (
                    <View style={[styles.weekCircleFilled, { backgroundColor: themeColors.streak }]} />
                  ) : (
                    <View style={[styles.weekCircle, { borderColor: themeColors.surface.border }]} />
                  )}
                </View>
              </View>
            );
          })}

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
                { backgroundColor: viewedMonthStats.change >= 0 ? themeColors.successDim : themeColors.errorDim }
              ]}>
                <Text style={[
                  styles.calendarChangeBadgeText,
                  { color: viewedMonthStats.change >= 0 ? themeColors.success : themeColors.error }
                ]}>
                  {viewedMonthStats.change >= 0 ? '+' : ''}{viewedMonthStats.change} vs this time last month
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

        {/* Weight Card: a prompt to log today's weight, or today's result once logged */}
        {(() => {
          const unit = weightData.settings?.unit || 'lbs';
          const latest = weightData.entries[0];
          const previous = weightData.entries[1];
          const openWeightTab = () => router.push({ pathname: '/(tabs)/progress', params: { view: 'weight' } });
          const openLogModal = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Today, blank unless today is already logged; wheels tucked away
            const todayEntry = weightData.entries.find(e => e.date === getTodayString());
            setWeightDate(new Date());
            setWeightInput(todayEntry ? todayEntry.weight.toFixed(1) : '');
            setWeightNotes(todayEntry?.notes || '');
            setWeightMedia(todayEntry?.media || []);
            setShowWeightDateWheels(false);
            setShowWeightModal(true);
          };

          if (!hasLoggedWeightToday) {
            return (
              <Pressable
                onPress={openLogModal}
                style={[styles.weightCard, styles.weightPromptCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.borderAccent }]}
              >
                <View style={styles.weightCardHeader}>
                  <View style={styles.weightCardTitleRow}>
                    <View style={[styles.weightPromptIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
                      <Scale size={18} color={themeColors.accent.primary} strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.weightCardTitle, { color: themeColors.text.primary }]}>Today&apos;s weigh-in</Text>
                      <Text style={[styles.weightPromptSub, { color: themeColors.text.tertiary }]}>
                        {latest
                          ? `Last: ${latest.weight.toFixed(1)} ${unit} · ${getRelativeDateLabel(latest.date)}`
                          : 'Log your weight to start tracking your trend'}
                      </Text>
                    </View>
                  </View>
                  {latest && (
                    <Pressable onPress={openWeightTab} hitSlop={10}>
                      <ChevronRight size={20} color={themeColors.text.tertiary} strokeWidth={2} />
                    </Pressable>
                  )}
                </View>
                <View style={[styles.weightPromptButton, { backgroundColor: themeColors.accent.primary }]}>
                  <Text style={[styles.weightPromptButtonText, { color: themeColors.text.inverse }]}>+ Log today&apos;s weight</Text>
                </View>
              </Pressable>
            );
          }

          const change = previous ? latest.weight - previous.weight : null;
          const goalDirection = weightData.goal?.direction;
          // Down is good when losing, up when gaining; neutral without a goal
          const isGood = change === null || change === 0 ? null
            : goalDirection === 'lose' ? change < 0
              : goalDirection === 'gain' ? change > 0 : null;
          const changeColor = isGood === null ? themeColors.text.secondary : isGood ? themeColors.success : themeColors.error;
          const changeBg = isGood === null ? themeColors.surface.cardActive : isGood ? themeColors.successDim : themeColors.errorDim;

          return (
            <Pressable
              onPress={openLogModal}
              style={[styles.weightCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
            >
              <View style={styles.weightCardHeader}>
                <View style={styles.weightCardTitleRow}>
                  <Scale size={18} color={themeColors.accent.primary} strokeWidth={2} />
                  <Text style={[styles.weightCardTitle, { color: themeColors.text.primary }]}>Weight</Text>
                </View>
                <View style={[styles.weightLoggedBadge, { backgroundColor: themeColors.successDim }]}>
                  <Check size={12} color={themeColors.success} strokeWidth={3} />
                  <Text style={[styles.weightLoggedText, { color: themeColors.success }]}>Logged today</Text>
                </View>
              </View>
              <View style={styles.weightCardContent}>
                <Text style={[styles.weightCardValue, { color: themeColors.text.primary }]}>{latest.weight.toFixed(1)}</Text>
                <Text style={[styles.weightCardUnit, { color: themeColors.text.tertiary }]}>{unit}</Text>
                {change !== null && (
                  <View style={[styles.weightCardChange, { backgroundColor: changeBg }]}>
                    <Text style={[styles.weightCardChangeText, { color: changeColor }]}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.weightCardFooter}>
                <Text style={[styles.weightCardLink, { color: themeColors.text.tertiary }]}>Tap to edit</Text>
                <Pressable
                  onPress={openWeightTab}
                  hitSlop={4}
                  style={({ pressed }) => [styles.weightCardTitleRow, styles.weightTrendLink, pressed && { opacity: 0.5 }]}
                >
                  <Text style={[styles.weightCardLink, { color: themeColors.accent.primary }]}>See trend</Text>
                  <ChevronRight size={16} color={themeColors.accent.primary} strokeWidth={2.5} />
                </Pressable>
              </View>
            </Pressable>
          );
        })()}

        {/* Weekly Goals Progress */}
        {weeklyGoals.length > 0 && (
          <View style={[styles.weeklyGoalsCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <View style={styles.weeklyGoalsHeader}>
              <Target size={18} color={themeColors.accent.primary} strokeWidth={2} />
              <Text style={[styles.weeklyGoalsTitle, { color: themeColors.text.primary }]}>Weekly Goals</Text>
            </View>
            {weeklyGoals.map((goal, index) => {
              const current = getGoalProgress(goal);
              const target = goal.target;
              const progress = Math.min(current / target, 1);
              const isComplete = current >= target;

              return (
                <View key={goal.id || index} style={styles.goalRow}>
                  <View style={styles.goalInfo}>
                    <View style={styles.goalLabelRow}>
                      {isComplete && (
                        <View style={[styles.goalCheckbox, { backgroundColor: themeColors.success }]}>
                          <Check size={10} color={themeColors.text.inverse} strokeWidth={3} />
                        </View>
                      )}
                      <Text style={[
                        styles.goalLabel,
                        { color: isComplete ? themeColors.success : themeColors.text.secondary }
                      ]}>
                        {getGoalLabel(goal)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.goalCount,
                      { color: isComplete ? themeColors.success : themeColors.text.primary }
                    ]}>
                      {current}/{target}
                    </Text>
                  </View>
                  <View style={[styles.goalProgressBar, { backgroundColor: themeColors.background.elevated }]}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: isComplete ? themeColors.success : themeColors.accent.primary,
                        }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Continue Workout Card - shows when there's an unsaved workout */}
        {inProgressWorkout && (
          <View style={[
            styles.continueWorkoutCard,
            { backgroundColor: themeColors.surface.card, borderColor: inProgressWorkout.isStale ? themeColors.warning : themeColors.surface.border }
          ]}>
            <View style={styles.continueWorkoutHeader}>
              <View style={[styles.continueWorkoutIcon, { backgroundColor: inProgressWorkout.isStale ? themeColors.warningDim : themeColors.background.elevated }]}>
                <RotateCcw size={18} color={inProgressWorkout.isStale ? themeColors.warning : themeColors.text.secondary} strokeWidth={2.5} />
              </View>
              <View style={styles.continueWorkoutInfo}>
                <Text style={[styles.continueWorkoutTitle, { color: inProgressWorkout.isStale ? themeColors.warning : themeColors.text.secondary }]}>
                  {inProgressWorkout.isStale ? 'UNSAVED WORKOUT' : 'CONTINUE WORKOUT'}
                </Text>
                <Text style={[styles.continueWorkoutSubtitle, { color: themeColors.text.secondary }]}>
                  {inProgressWorkout.workout?.name || 'Untitled workout'}
                  {inProgressWorkout.workout?.exercises?.length > 0 &&
                    ` • ${inProgressWorkout.workout.exercises.length} exercise${inProgressWorkout.workout.exercises.length !== 1 ? 's' : ''}`
                  }
                </Text>
                {inProgressWorkout.isStale && (
                  <Text style={[styles.continueWorkoutStaleText, { color: themeColors.warning }]}>
                    Saved {inProgressWorkout.hoursSinceSave}h ago - recover or discard
                  </Text>
                )}
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
              <Text style={[styles.continueButtonText, { color: themeColors.text.inverse }]}>{inProgressWorkout.isStale ? 'Recover' : 'Continue'}</Text>
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
              <Text style={[styles.todayWorkoutTitle, { color: themeColors.accent.primary }]}>{"TODAY'S WORKOUT"}</Text>
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

      {/* Weight Log Modal */}
      <Modal
        visible={showWeightModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <GestureHandlerRootView style={[styles.weightModalScreen, { backgroundColor: themeColors.background.primary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.weightModalScreen}
          >
            <ScrollView
              contentContainerStyle={styles.weightModalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.weightModalHeader}>
                <Text style={[styles.weightModalTitle, { color: themeColors.text.primary }]}>
                  {weightDateLogged ? 'Edit Weigh-in' : 'Log Weight'}
                </Text>
                <Pressable onPress={() => setShowWeightModal(false)}>
                  <X size={24} color={themeColors.text.tertiary} />
                </Pressable>
              </View>

              <WeightDateSelect
                date={weightDate}
                onChange={changeWeightDate}
                entries={weightData.entries}
                unit={weightData.settings?.unit || 'lbs'}
                wheelsOpen={showWeightDateWheels}
                onWheelsOpenChange={setShowWeightDateWheels}
                colors={themeColors}
                isDark={isDark}
              />

              <View style={styles.weightModalInputRow}>
                <TextInput
                  style={[styles.weightModalInput, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border, color: themeColors.text.primary }]}
                  placeholder="0.0"
                  placeholderTextColor={themeColors.text.tertiary}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  onFocus={() => { if (Platform.OS === 'ios') setShowWeightDateWheels(false); }}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.weightModalUnit, { color: themeColors.text.secondary }]}>{weightData.settings?.unit || 'lbs'}</Text>
              </View>

              {/* Notes Input */}
              <Text style={[styles.weightModalLabel, { color: themeColors.text.tertiary }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.weightModalNotesInput, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border, color: themeColors.text.primary }]}
                placeholder="How are you feeling?"
                placeholderTextColor={themeColors.text.tertiary}
                value={weightNotes}
                onChangeText={setWeightNotes}
                onFocus={() => { if (Platform.OS === 'ios') setShowWeightDateWheels(false); }}
                multiline
                numberOfLines={2}
              />

              {/* Photo Section */}
              <Text style={[styles.weightModalLabel, { color: themeColors.text.tertiary }]}>PHOTO (OPTIONAL)</Text>
              <View style={styles.weightPhotoContainer}>
                {weightMedia.map((media) => (
                  <Pressable
                    key={media.id}
                    onLongPress={() => handleRemoveWeightPhoto(media.id)}
                    onPress={() => setWeightMediaViewer(media)}
                    style={styles.weightPhotoThumbnail}
                  >
                    <Image source={{ uri: media.uri }} style={styles.weightPhotoImage} />
                  </Pressable>
                ))}
                <Pressable
                  onPress={handleAddWeightPhoto}
                  style={[styles.weightPhotoAdd, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                >
                  <Camera size={24} color={themeColors.text.tertiary} strokeWidth={2} />
                </Pressable>
              </View>

              <View style={styles.weightModalButtons}>
                <Pressable
                  style={[styles.weightModalCancel, { backgroundColor: themeColors.surface.card }]}
                  onPress={() => {
                    setShowWeightModal(false);
                    setWeightInput('');
                    setWeightNotes('');
                    setWeightMedia([]);
                  }}
                >
                  <Text style={[styles.weightModalCancelText, { color: themeColors.text.secondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.weightModalSave, { backgroundColor: themeColors.accent.primary, opacity: weightInput ? 1 : 0.5 }]}
                  onPress={submitWeight}
                  disabled={isSubmittingWeight || !weightInput}
                >
                  <Check size={18} color={themeColors.text.inverse} strokeWidth={2.5} />
                  <Text style={[styles.weightModalSaveText, { color: themeColors.text.inverse }]}>{weightDateLogged ? 'Update' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
        {/* Photo viewer, opened from the photo thumbnails */}
        <Modal
          visible={!!weightMediaViewer}
          transparent
          animationType="fade"
          onRequestClose={() => setWeightMediaViewer(null)}
        >
          <TouchableOpacity
            style={[styles.weightMediaViewerOverlay, { backgroundColor: themeColors.overlay.heavy }]}
            activeOpacity={1}
            onPress={() => setWeightMediaViewer(null)}
          >
            {weightMediaViewer && (
              <Image
                source={{ uri: weightMediaViewer.uri }}
                style={styles.weightMediaViewerImage}
              />
            )}
            <TouchableOpacity
              style={styles.weightMediaViewerClose}
              onPress={() => setWeightMediaViewer(null)}
            >
              <X size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </Modal>

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
  weekCirclePending: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
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
  calendarChangeBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
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
  continueWorkoutStaleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 4,
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

  // Log Weight Button
  logWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  logWeightText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },

  // Weekly Goals Card
  weeklyGoalsCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  weeklyGoalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  weeklyGoalsTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  goalRow: {
    marginBottom: SPACING.md,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  goalCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  goalCount: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
  },
  goalProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background.elevated,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accent.primary,
  },

  // Weight Modal
  weightModalScreen: {
    flex: 1,
  },
  weightModalContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  weightModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weightModalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  weightModalDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
  },
  weightModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  weightModalInput: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  weightModalUnit: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.secondary,
  },
  weightModalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  weightModalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  weightModalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  weightModalSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  weightModalSaveText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Weight Card
  weightCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  weightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weightCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  weightCardTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  weightCardContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  weightCardValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 36,
    color: COLORS.text.primary,
  },
  weightCardUnit: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  weightCardChange: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  weightCardChangeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  weightCardEmpty: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  weightCardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  weightCardButtonText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
  },
  weightPromptCard: {
    borderWidth: 1.5,
  },
  weightPromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightPromptSub: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  weightPromptButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  weightPromptButtonText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
  },
  weightLoggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  weightLoggedText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  weightCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightTrendLink: {
    gap: 2,
  },
  weightCardLink: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
  },

  // Weight Modal Enhancements
  weightDateText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  weightModalLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  weightModalNotesInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    ...TYPOGRAPHY.body,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  weightPhotoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  weightPhotoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  weightPhotoImage: {
    width: '100%',
    height: '100%',
  },
  weightPhotoAdd: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Weight History Modal
  weightMediaViewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightMediaViewerImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  weightMediaViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: SPACING.md,
  },
});
