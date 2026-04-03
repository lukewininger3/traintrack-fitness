import { Activity, BookOpen, Calendar, Camera, Check, ChevronLeft, ChevronRight, Clock, Copy, Dumbbell, Edit3, Image, Plus, Save, Scale, Search, Target, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import {
  loadWeeklyGoals,
  saveWeeklyGoals,
  createDefaultGoals,
  getWeekStart,
  formatWeekRange,
  DAY_NAMES,
  updateGoalProgress,
  addPlannedWorkout,
  removePlannedWorkout,
  updatePlannedWorkout,
  getDateFromDayOfWeek,
  copyLastWeekPlan,
  saveWeeklyPlanTemplate,
  loadWeeklyPlanTemplates,
  applyWeeklyPlanTemplate,
  deleteWeeklyPlanTemplate,
} from '../utils/goalsStorage';
import WeeklyPlanCard from '../components/WeeklyPlanCard';
import WorkoutProgressRing from '../components/WorkoutProgressRing';
import {
  loadWeightData,
  addWeightEntry,
  deleteWeightEntry,
  setWeightGoal,
  clearWeightGoal,
  calculateWeightProgress,
  formatWeight,
} from '../utils/weightStorage';
import { loadWorkouts } from '../utils/storage';
import { EXERCISE_DATABASE, getAllCategories } from '../constants/workoutTypes';
import { loadCustomExercises } from '../utils/customExercises';

export default function GoalsScreen() {
  const { colors: themeColors } = useTheme();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [goals, setGoals] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [weightData, setWeightData] = useState(null);

  // Modals
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showPlanDay, setShowPlanDay] = useState(null); // day index
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(null); // selected planned workout
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [showWeightGoal, setShowWeightGoal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);

  // Form states
  const [newGoalType, setNewGoalType] = useState('count');
  const [newGoalTarget, setNewGoalTarget] = useState('4');
  const [newGoalWorkoutType, setNewGoalWorkoutType] = useState('Strength');
  const [plannedWorkoutName, setPlannedWorkoutName] = useState('');
  const [plannedWorkoutType, setPlannedWorkoutType] = useState('Strength');
  const [plannedExercises, setPlannedExercises] = useState([]);
  const [weightEntry, setWeightEntry] = useState('');
  const [weightEntryDate, setWeightEntryDate] = useState(new Date());
  const [weightEntryNotes, setWeightEntryNotes] = useState('');
  const [weightEntryMedia, setWeightEntryMedia] = useState([]);
  const [showWeightMediaViewer, setShowWeightMediaViewer] = useState(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [weightDirection, setWeightDirection] = useState('lose');

  // Exercise picker states
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customExercises, setCustomExercises] = useState([]);
  const [editingWorkout, setEditingWorkout] = useState(null); // For editing existing planned workout
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');

  // Refs for scroll behavior
  const planScrollViewRef = useRef(null);

  // Check if workout type is cardio (needs distance input)
  const isCardioType = (type) => ['Running', 'Cycling', 'Swimming'].includes(type);

  // Stable date-only comparison for weight entry navigation
  const isWeightDateToday = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(weightEntryDate);
    compare.setHours(0, 0, 0, 0);
    return compare >= today;
  })();

  // Format date for display
  const formatDateDisplay = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadData = useCallback(async () => {
    try {
      // Load goals
      let goalsData = await loadWeeklyGoals(weekStart);
      if (!goalsData) {
        goalsData = createDefaultGoals(weekStart);
        await saveWeeklyGoals(goalsData);
      }

      // Load workouts and update progress
      const workoutsData = await loadWorkouts();
      setWorkouts(workoutsData);

      // Update goal progress based on workouts
      const result = await updateGoalProgress(workoutsData, weekStart);

      if (result.updated) {
        goalsData = await loadWeeklyGoals(weekStart);
      }

      setGoals(goalsData);

      // Load weight data
      const weight = await loadWeightData();
      setWeightData(weight);

      // Load templates
      const savedTemplates = await loadWeeklyPlanTemplates();
      setTemplates(savedTemplates);
    } catch (error) {
      console.error('Error loading goals data:', error);
    }
  }, [weekStart]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const navigateWeek = (direction) => {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = weekStart.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + (direction * 7));
    const newYear = current.getFullYear();
    const newMonth = String(current.getMonth() + 1).padStart(2, '0');
    const newDay = String(current.getDate()).padStart(2, '0');
    setWeekStart(`${newYear}-${newMonth}-${newDay}`);
  };

  const handleAddGoal = async () => {
    if (!newGoalTarget || parseFloat(newGoalTarget) <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid target number');
      return;
    }

    const newGoal = {
      id: Date.now(),
      type: newGoalType,
      target: parseFloat(newGoalTarget),
      workoutType: newGoalType === 'type_count' ? newGoalWorkoutType : null,
      label: newGoalType === 'type_count'
        ? `${newGoalTarget} ${newGoalWorkoutType} sessions`
        : newGoalType === 'days'
          ? `Active ${newGoalTarget} days`
          : `${newGoalTarget} workouts`,
      current: 0,
      completed: false,
    };

    const updatedGoals = {
      ...goals,
      goals: [...goals.goals, newGoal],
    };

    await saveWeeklyGoals(updatedGoals);
    await loadData();
    setShowAddGoal(false);
    setNewGoalTarget('4');
  };

  const handleRemoveGoal = async (goalId) => {
    Alert.alert('Remove Goal', 'Are you sure you want to remove this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedGoals = {
            ...goals,
            goals: goals.goals.filter(g => g.id !== goalId),
          };
          await saveWeeklyGoals(updatedGoals);
          await loadData();
        },
      },
    ]);
  };

  const handlePlanWorkout = async () => {
    if (!plannedWorkoutName.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return;
    }

    if (editingWorkout) {
      // Update existing planned workout
      await updatePlannedWorkout(weekStart, editingWorkout.id, {
        name: plannedWorkoutName,
        workoutType: plannedWorkoutType,
        exercises: plannedExercises,
      });
    } else {
      // Add new planned workout
      await addPlannedWorkout(weekStart, {
        dayOfWeek: showPlanDay,
        name: plannedWorkoutName,
        workoutType: plannedWorkoutType,
        exercises: plannedExercises,
      });
    }

    await loadData();
    closePlanModal();
  };

  const closePlanModal = () => {
    setShowPlanDay(null);
    setPlannedWorkoutName('');
    setPlannedWorkoutType('Strength');
    setPlannedExercises([]);
    setEditingWorkout(null);
    setShowExercisePicker(false);
    setExerciseSearchQuery('');
    setSelectedCategory(null);
  };

  const openEditWorkout = (workout) => {
    setEditingWorkout(workout);
    setPlannedWorkoutName(workout.name || '');
    setPlannedWorkoutType(workout.workoutType || 'Strength');
    setPlannedExercises(workout.exercises || []);
    setShowPlanDay(workout.dayOfWeek);
    setShowWorkoutDetail(null);
  };

  // Load custom exercises when exercise picker opens
  const openExercisePicker = async () => {
    const custom = await loadCustomExercises();
    setCustomExercises(custom || []);
    setShowExercisePicker(true);
  };

  const addExerciseToPlanned = (exerciseName) => {
    // For cardio types, allow multiple sessions (e.g., multiple Running sessions)
    const isCardioSession = isCardioType(exerciseName);

    // Check if already added (only for non-cardio exercises)
    if (!isCardioSession && plannedExercises.some(e => e.name === exerciseName)) {
      Alert.alert('Already Added', 'This exercise is already in your plan');
      return;
    }

    // For cardio, name sessions as "Session 1", "Session 2", etc.
    let sessionName = exerciseName;
    if (isCardioSession) {
      const existingSessionCount = plannedExercises.filter(e =>
        e.name.startsWith('Session') || e.name === exerciseName
      ).length;
      sessionName = `Session ${existingSessionCount + 1}`;
    }

    setPlannedExercises([...plannedExercises, { name: sessionName, distance: null, sets: [] }]);
    setShowExercisePicker(false);
    setExerciseSearchQuery('');
    setSelectedCategory(null);
    // Auto-scroll to bottom after adding exercise
    setTimeout(() => {
      planScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeExerciseFromPlanned = (index) => {
    setPlannedExercises(plannedExercises.filter((_, i) => i !== index));
  };

  const updateExerciseDistance = (index, distance) => {
    const updated = [...plannedExercises];
    updated[index] = { ...updated[index], distance: distance ? parseFloat(distance) : null };
    setPlannedExercises(updated);
  };

  // Set management for planned exercises (strength workouts)
  const addSetToPlannedExercise = (exerciseIndex) => {
    const updated = [...plannedExercises];
    const exercise = updated[exerciseIndex];
    const sets = exercise.sets || [];
    // Copy weight from last set if available
    const lastWeight = sets.length > 0 ? sets[sets.length - 1].weight : '';
    updated[exerciseIndex] = { ...exercise, sets: [...sets, { weight: lastWeight }] };
    setPlannedExercises(updated);
  };

  const updatePlannedSetWeight = (exerciseIndex, setIndex, weight) => {
    const updated = [...plannedExercises];
    const exercise = updated[exerciseIndex];
    const sets = [...(exercise.sets || [])];
    sets[setIndex] = { ...sets[setIndex], weight: weight };
    updated[exerciseIndex] = { ...exercise, sets };
    setPlannedExercises(updated);
  };

  const removeSetFromPlannedExercise = (exerciseIndex, setIndex) => {
    const updated = [...plannedExercises];
    const exercise = updated[exerciseIndex];
    const sets = (exercise.sets || []).filter((_, i) => i !== setIndex);
    updated[exerciseIndex] = { ...exercise, sets };
    setPlannedExercises(updated);
  };

  // Handle workout type change with warning if switching between cardio/strength with existing data
  const handleWorkoutTypeChange = (newType) => {
    // If same type, do nothing
    if (newType === plannedWorkoutType) return;

    // Check if switching between cardio and strength
    const currentIsCardio = isCardioType(plannedWorkoutType);
    const newIsCardio = isCardioType(newType);
    const isSwitchingCategory = currentIsCardio !== newIsCardio;

    // If switching category and there are exercises/sessions, warn the user
    if (isSwitchingCategory && plannedExercises.length > 0) {
      const currentLabel = currentIsCardio ? 'sessions' : 'exercises';
      Alert.alert(
        'Change Workout Type?',
        `Switching to ${newIsCardio ? 'cardio' : 'strength'} will remove your current ${currentLabel}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              setPlannedExercises([]);
              setPlannedWorkoutType(newType);
            },
          },
        ]
      );
    } else {
      // No data to lose or staying within same category, just switch
      setPlannedWorkoutType(newType);
    }
  };

  // Get filtered exercises based on search and category
  const filteredExercises = useMemo(() => {
    let exercises = [];

    // Add built-in exercises
    if (selectedCategory) {
      exercises = EXERCISE_DATABASE[selectedCategory] || [];
    } else {
      Object.values(EXERCISE_DATABASE).forEach(categoryExercises => {
        exercises = [...exercises, ...categoryExercises];
      });
    }

    // Add custom exercises
    if (customExercises.length > 0) {
      if (!selectedCategory) {
        exercises = [...exercises, ...customExercises.map(e => e.name)];
      } else {
        const categoryCustom = customExercises.filter(e => e.category === selectedCategory);
        exercises = [...exercises, ...categoryCustom.map(e => e.name)];
      }
    }

    // Filter by search query
    if (exerciseSearchQuery.trim()) {
      const query = exerciseSearchQuery.toLowerCase();
      exercises = exercises.filter(e => e.toLowerCase().includes(query));
    }

    // Remove duplicates
    return [...new Set(exercises)].sort();
  }, [selectedCategory, customExercises, exerciseSearchQuery]);

  const handleRemovePlannedWorkout = async (plannedWorkoutId) => {
    await removePlannedWorkout(weekStart, plannedWorkoutId);
    await loadData();
  };

  const handleLogWeight = async () => {
    if (!weightEntry || parseFloat(weightEntry) <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    await addWeightEntry(parseFloat(weightEntry), weightEntryNotes, weightEntryDate, weightEntryMedia);
    await loadData();
    setShowWeightEntry(false);
    setWeightEntry('');
    setWeightEntryDate(new Date());
    setWeightEntryNotes('');
    setWeightEntryMedia([]);
  };

  const handleAddWeightMedia = async () => {
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
              setWeightEntryMedia(prev => [...prev, {
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
              setWeightEntryMedia(prev => [...prev, {
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

  const handleRemoveWeightMedia = (mediaId) => {
    setWeightEntryMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  const handleSetWeightGoal = async () => {
    if (!targetWeight || parseFloat(targetWeight) <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid target weight');
      return;
    }

    await setWeightGoal(parseFloat(targetWeight), weightDirection);
    await loadData();
    setShowWeightGoal(false);
    setTargetWeight('');
  };

  const handleDeleteWeightGoal = () => {
    Alert.alert(
      'Delete Weight Goal',
      'Are you sure you want to delete your weight goal? Your weight history will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearWeightGoal();
            await loadData();
          },
        },
      ]
    );
  };

  // Copy last week's plan
  const handleCopyLastWeek = async () => {
    const result = await copyLastWeekPlan(weekStart);
    if (result.success) {
      Alert.alert('Plan Copied', `Copied ${result.count} workouts from last week`);
      await loadData();
    } else {
      Alert.alert('No Plan Found', 'No planned workouts found for last week');
    }
  };

  // Save current plan as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this template');
      return;
    }
    if (!goals?.plannedWorkouts?.length) {
      Alert.alert('No Workouts', 'Add some planned workouts before saving as a template');
      return;
    }
    const result = await saveWeeklyPlanTemplate(templateName.trim(), goals.plannedWorkouts);
    if (result.success) {
      Alert.alert('Template Saved', `"${templateName}" has been saved`);
      setTemplateName('');
      setShowTemplateModal(false);
      await loadData();
    }
  };

  // Apply a template
  const handleApplyTemplate = async (template) => {
    Alert.alert(
      'Apply Template',
      `This will replace your current weekly plan with "${template.name}". Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            const result = await applyWeeklyPlanTemplate(template, weekStart);
            if (result.success) {
              setShowTemplateModal(false);
              await loadData();
            }
          }
        }
      ]
    );
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId) => {
    await deleteWeeklyPlanTemplate(templateId);
    await loadData();
  };

  const weightProgress = weightData ? calculateWeightProgress(weightData) : null;

  // Get all planned workouts for a specific day (supports multiple)
  const getPlannedForDay = (dayIndex) => {
    if (!goals?.plannedWorkouts) return [];
    return goals.plannedWorkouts.filter(p => p.dayOfWeek === dayIndex);
  };

  // Check if there's a workout on a specific day
  const hasWorkoutOnDay = (dayIndex) => {
    const dateStr = getDateFromDayOfWeek(weekStart, dayIndex);
    return workouts.some(w => w.date === dateStr);
  };

  const isCurrentWeek = weekStart === getWeekStart();
  const today = new Date().getDay();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Progress Ring */}
        <View style={[styles.progressRingCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          {/* Week Selector */}
          <View style={styles.weekSelector}>
            <Pressable onPress={() => navigateWeek(-1)} style={styles.weekArrow} accessibilityLabel="Previous week" accessibilityRole="button">
              <ChevronLeft size={20} color={themeColors.text.tertiary} />
            </Pressable>
            <Text style={[styles.weekText, { color: themeColors.text.primary }]}>{formatWeekRange(weekStart)}</Text>
            <Pressable onPress={() => navigateWeek(1)} style={styles.weekArrow} accessibilityLabel="Next week" accessibilityRole="button">
              <ChevronRight size={20} color={themeColors.text.tertiary} />
            </Pressable>
          </View>
          <WorkoutProgressRing plannedWorkouts={goals?.plannedWorkouts || []} />
        </View>

        {/* Weekly Plan */}
        <View style={styles.section}>
          {/* Plan Actions */}
          <View style={styles.planActionsRow}>
            <Pressable
              style={[styles.planActionButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
              onPress={handleCopyLastWeek}
            >
              <Copy size={14} color={themeColors.accent.primary} strokeWidth={2} />
              <Text style={[styles.planActionText, { color: themeColors.accent.primary }]}>Copy Last Week</Text>
            </Pressable>
            <Pressable
              style={[styles.planActionButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
              onPress={() => setShowTemplateModal(true)}
            >
              <BookOpen size={14} color={themeColors.accent.primary} strokeWidth={2} />
              <Text style={[styles.planActionText, { color: themeColors.accent.primary }]}>Templates</Text>
            </Pressable>
          </View>

          <WeeklyPlanCard
            weekStart={weekStart}
            getPlannedForDay={getPlannedForDay}
            hasWorkoutOnDay={hasWorkoutOnDay}
            isCurrentWeek={isCurrentWeek}
            today={today}
            onPlanDay={(dayIndex) => setShowPlanDay(dayIndex)}
            onWorkoutPress={(workout) => setShowWorkoutDetail(workout)}
            onRemoveWorkout={handleRemovePlannedWorkout}
          />
        </View>

        {/* Workout Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>WORKOUT GOALS</Text>
            <Pressable onPress={() => setShowAddGoal(true)} style={[styles.addButton, { backgroundColor: themeColors.accent.primaryDim }]} accessibilityLabel="Add workout goal" accessibilityRole="button">
              <Plus size={16} color={themeColors.accent.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {goals?.goals?.length > 0 ? (
            <View style={[styles.goalsCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              {goals.goals.map((goal) => (
                <View key={goal.id} style={[styles.goalItem, { borderBottomColor: themeColors.surface.border }]}>
                  <View style={styles.goalInfo}>
                    <View style={[
                      styles.goalCheckbox,
                      { borderColor: themeColors.text.tertiary },
                      goal.completed && { backgroundColor: themeColors.success, borderColor: themeColors.success },
                    ]}>
                      {goal.completed && (
                        <Check size={12} color={themeColors.text.inverse} strokeWidth={3} />
                      )}
                    </View>
                    <Text style={[
                      styles.goalLabel,
                      { color: themeColors.text.primary },
                      goal.completed && { color: themeColors.success },
                    ]}>
                      {goal.label}
                    </Text>
                  </View>
                  <View style={styles.goalProgress}>
                    <View style={[styles.goalProgressBar, { backgroundColor: themeColors.surface.border }]}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          { width: `${Math.min(100, (goal.current / goal.target) * 100)}%`, backgroundColor: themeColors.accent.primary },
                          goal.completed && { backgroundColor: themeColors.success },
                        ]}
                      />
                    </View>
                    <Text style={[styles.goalCount, { color: themeColors.text.tertiary }]}>
                      {goal.current}/{goal.target}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveGoal(goal.id)}
                      style={styles.goalRemove}
                    >
                      <Trash2 size={14} color={themeColors.text.tertiary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={[styles.emptyCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]} onPress={() => setShowAddGoal(true)}>
              <Target size={24} color={themeColors.text.tertiary} />
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>No goals set</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>Tap to add a workout goal</Text>
            </Pressable>
          )}
        </View>

        {/* Weight Goal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>WEIGHT GOAL</Text>
            {weightData?.goal && (
              <Pressable onPress={() => setShowWeightEntry(true)} style={[styles.addButton, { backgroundColor: themeColors.accent.primaryDim }]} accessibilityLabel="Log weight" accessibilityRole="button">
                <Plus size={16} color={themeColors.accent.primary} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {weightProgress ? (() => {
            // Determine if user is going in the right direction
            const startWeight = weightProgress.startWeight ?? weightData?.goal?.startWeight;
            const currentWeight = weightProgress.currentWeight;
            const hasStartWeight = startWeight !== undefined && startWeight !== null;
            const actualChange = hasStartWeight ? currentWeight - startWeight : 0;
            const isLosingWeight = actualChange < 0;
            const isGainingWeight = actualChange > 0;
            const goalDirection = weightProgress.direction;

            // Determine if going right/wrong direction based on goal
            let isRightDirection = false;
            let isWrongDirection = false;
            if (hasStartWeight && actualChange !== 0) {
              if (goalDirection === 'lose') {
                isRightDirection = isLosingWeight;
                isWrongDirection = isGainingWeight;
              } else if (goalDirection === 'gain') {
                isRightDirection = isGainingWeight;
                isWrongDirection = isLosingWeight;
              }
              // For 'maintain', neither direction is right/wrong
            }

            const progressColor = weightProgress.isComplete
              ? themeColors.success
              : isRightDirection
                ? themeColors.success
                : isWrongDirection
                  ? themeColors.error
                  : themeColors.text.secondary;

            // Show actual change direction in text
            const changeText = !hasStartWeight || actualChange === 0
              ? 'No change yet'
              : `${Math.abs(actualChange).toFixed(1)} ${weightData?.settings?.unit || 'lbs'} ${isLosingWeight ? 'lost' : 'gained'}`;

            return (
              <View style={[styles.weightCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                <View style={styles.weightHeader}>
                  <View style={styles.weightCurrent}>
                    <Text style={[styles.weightValue, { color: themeColors.text.primary }]}>
                      {formatWeight(weightProgress.currentWeight, weightData?.settings?.unit || 'lbs')}
                    </Text>
                    <Text style={[styles.weightLabel, { color: themeColors.text.tertiary }]}>CURRENT</Text>
                  </View>
                  <View style={styles.weightArrow}>
                    <Text style={[styles.weightArrowText, { color: themeColors.text.tertiary }]}>→</Text>
                  </View>
                  <View style={styles.weightTarget}>
                    <Text style={[styles.weightValue, { color: themeColors.text.primary }]}>
                      {formatWeight(weightProgress.targetWeight, weightData?.settings?.unit || 'lbs')}
                    </Text>
                    <Text style={[styles.weightLabel, { color: themeColors.text.tertiary }]}>GOAL</Text>
                  </View>
                </View>

                <View style={[styles.weightProgressBar, { backgroundColor: themeColors.surface.border }]}>
                  <View
                    style={[
                      styles.weightProgressFill,
                      { width: `${weightProgress.progress}%`, backgroundColor: progressColor },
                    ]}
                  />
                </View>

                <View style={styles.weightStats}>
                  <Text style={[styles.weightStat, { color: progressColor }]}>
                    {changeText}
                  </Text>
                  <Text style={[styles.weightStat, { color: themeColors.text.secondary }]}>
                    {weightProgress.remaining.toFixed(1)} {weightData?.settings?.unit || 'lbs'} to go
                  </Text>
                </View>

                <View style={styles.weightCardActions}>
                  <Pressable onPress={() => setShowWeightEntry(true)} style={[styles.logWeightButton, { backgroundColor: themeColors.accent.primaryDim }]}>
                    <Scale size={16} color={themeColors.accent.primary} />
                    <Text style={[styles.logWeightText, { color: themeColors.accent.primary }]}>Log Weight</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowWeightHistory(true)} style={[styles.viewHistoryButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                    <Clock size={16} color={themeColors.text.secondary} />
                    <Text style={[styles.viewHistoryText, { color: themeColors.text.tertiary }]}>History</Text>
                  </Pressable>
                </View>

                <View style={styles.weightGoalActions}>
                  <Pressable
                    onPress={() => {
                      setTargetWeight(weightData.goal.targetWeight?.toString() || '');
                      setWeightDirection(weightData.goal.direction || 'lose');
                      setShowWeightGoal(true);
                    }}
                    style={[styles.weightGoalActionButton, { borderColor: themeColors.surface.border }]}
                  >
                    <Edit3 size={14} color={themeColors.text.secondary} />
                    <Text style={[styles.weightGoalActionText, { color: themeColors.text.secondary }]}>Edit Goal</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteWeightGoal}
                    style={[styles.weightGoalActionButton, { borderColor: themeColors.surface.border }]}
                  >
                    <Trash2 size={14} color={themeColors.error} />
                    <Text style={[styles.weightGoalActionText, { color: themeColors.error }]}>Delete Goal</Text>
                  </Pressable>
                </View>
              </View>
            );
          })() : weightData?.entries?.length > 0 ? (
            <Pressable style={[styles.weightCardNoGoal, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]} onPress={() => setShowWeightHistory(true)}>
              <Text style={[styles.currentWeightLabel, { color: themeColors.text.tertiary }]}>Current Weight</Text>
              <Text style={[styles.currentWeightValue, { color: themeColors.text.primary }]}>
                {formatWeight(weightData.entries[0]?.weight, weightData?.settings?.unit || 'lbs')}
              </Text>
              <View style={styles.weightActions}>
                <Pressable onPress={() => setShowWeightEntry(true)} style={[styles.weightActionButton, { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }]}>
                  <Plus size={14} color={themeColors.accent.primary} />
                  <Text style={[styles.weightActionText, { color: themeColors.accent.primary }]}>Log</Text>
                </Pressable>
                <Pressable onPress={() => {
                  // Pre-populate with current goal values
                  if (weightData?.goal) {
                    setTargetWeight(weightData.goal.targetWeight?.toString() || '');
                    setWeightDirection(weightData.goal.direction || 'lose');
                  }
                  setShowWeightGoal(true);
                }} style={[styles.weightActionButton, { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }]}>
                  <Target size={14} color={themeColors.accent.primary} />
                  <Text style={[styles.weightActionText, { color: themeColors.accent.primary }]}>{weightData?.goal ? 'Edit Goal' : 'Set Goal'}</Text>
                </Pressable>
                <Pressable onPress={() => setShowWeightHistory(true)} style={[styles.weightActionButton, { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }]}>
                  <Clock size={14} color={themeColors.accent.primary} />
                  <Text style={[styles.weightActionText, { color: themeColors.accent.primary }]}>History</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <Pressable style={[styles.emptyCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]} onPress={() => setShowWeightEntry(true)}>
              <Scale size={24} color={themeColors.text.tertiary} />
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>No weight logged</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>Tap to log your weight</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={showAddGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddGoal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>ADD GOAL</Text>
                  <Pressable onPress={() => setShowAddGoal(false)}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>GOAL TYPE</Text>
                <View style={styles.typeButtons}>
                  {[
                    { value: 'count', label: 'Total Workouts' },
                    { value: 'type_count', label: 'Specific Type' },
                    { value: 'days', label: 'Active Days' },
                  ].map(type => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.typeButton,
                        newGoalType === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewGoalType(type.value)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        newGoalType === type.value && styles.typeButtonTextActive,
                      ]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {newGoalType === 'type_count' && (
                  <>
                    <Text style={styles.inputLabel}>WORKOUT TYPE</Text>
                    <View style={styles.typeButtons}>
                      {['Strength', 'Running', 'Cycling', 'Swimming'].map(type => (
                        <Pressable
                          key={type}
                          style={[
                            styles.typeButton,
                            newGoalWorkoutType === type && styles.typeButtonActive,
                          ]}
                          onPress={() => setNewGoalWorkoutType(type)}
                        >
                          <Text style={[
                            styles.typeButtonText,
                            newGoalWorkoutType === type && styles.typeButtonTextActive,
                          ]}>
                            {type}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.inputLabel}>TARGET</Text>
                <TextInput
                  style={styles.input}
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                  keyboardType="number-pad"
                  placeholder="4"
                  placeholderTextColor={themeColors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Pressable onPress={handleAddGoal} style={[styles.modalButton, { marginTop: SPACING.lg }]}>
                  <Text style={styles.modalButtonText}>Add Goal</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Plan Day Modal - Full Screen */}
      <Modal
        visible={showPlanDay !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePlanModal}
      >
        <SafeAreaView style={styles.planModal} edges={['top', 'bottom']}>
          {/* Conditionally show Exercise Picker or Plan Form */}
          {showExercisePicker ? (
            /* Exercise Picker View - shown inside the same modal */
            <>
              <View style={styles.exercisePickerHeader}>
                <View style={styles.modalHandle} />
                <View style={styles.exercisePickerTitleRow}>
                  <Text style={styles.planModalTitle}>ADD EXERCISE</Text>
                  <Pressable
                    onPress={() => {
                      setShowExercisePicker(false);
                      setExerciseSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    style={styles.planModalClose}
                  >
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                {/* Search Input */}
                <View style={styles.exerciseSearchContainer}>
                  <Search size={18} color={themeColors.text.tertiary} strokeWidth={2} />
                  <TextInput
                    style={styles.exerciseSearchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={themeColors.text.tertiary}
                    value={exerciseSearchQuery}
                    onChangeText={setExerciseSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {exerciseSearchQuery.length > 0 && (
                    <Pressable onPress={() => setExerciseSearchQuery('')} style={styles.clearSearchButton}>
                      <X size={16} color={themeColors.text.tertiary} />
                    </Pressable>
                  )}
                </View>

              </View>

              <ScrollView style={styles.exercisePickerList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {exerciseSearchQuery.trim() ? (
                  // Search Results
                  <>
                    <Text style={styles.browseCategoriesTitle}>SEARCH RESULTS</Text>
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((exercise, index) => (
                        <Pressable
                          key={index}
                          style={styles.exercisePickerItem}
                          onPress={() => addExerciseToPlanned(exercise)}
                        >
                          <Text style={styles.exercisePickerItemText}>{exercise}</Text>
                          <Plus size={18} color={themeColors.accent.primary} />
                        </Pressable>
                      ))
                    ) : (
                      <View style={styles.noExercisesFound}>
                        <Text style={styles.noExercisesFoundText}>No exercises found</Text>
                      </View>
                    )}
                  </>
                ) : !selectedCategory ? (
                  // Browse by Category Grid
                  <>
                    <Text style={styles.browseCategoriesTitle}>BROWSE BY CATEGORY</Text>
                    <View style={styles.categoryGrid}>
                      {getAllCategories().map(category => (
                        <Pressable
                          key={category}
                          style={styles.categoryGridButton}
                          onPress={() => setSelectedCategory(category)}
                        >
                          <Text style={styles.categoryGridButtonText}>{category}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  // Exercises in Selected Category
                  <>
                    <Pressable
                      onPress={() => setSelectedCategory(null)}
                      style={styles.backToCategoriesButton}
                    >
                      <Text style={styles.backToCategoriesText}>← Back to categories</Text>
                    </Pressable>
                    {filteredExercises.map((exercise, index) => (
                      <Pressable
                        key={index}
                        style={styles.exercisePickerItem}
                        onPress={() => addExerciseToPlanned(exercise)}
                      >
                        <Text style={styles.exercisePickerItemText}>{exercise}</Text>
                        <Plus size={18} color={themeColors.accent.primary} />
                      </Pressable>
                    ))}
                  </>
                )}
                <View style={{ height: 50 }} />
              </ScrollView>
            </>
          ) : (
            /* Plan Form View */
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={styles.planModalHeader}>
                <View style={styles.modalHandle} />
                <View style={styles.planModalTitleRow}>
                  <Text style={styles.planModalTitle}>
                    {editingWorkout ? 'EDIT WORKOUT' : `PLAN ${showPlanDay !== null ? DAY_NAMES[showPlanDay].toUpperCase() : ''}`}
                  </Text>
                  <Pressable onPress={closePlanModal} style={styles.planModalClose}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                ref={planScrollViewRef}
                style={styles.planModalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.inputLabel}>WORKOUT NAME</Text>
                <TextInput
                  style={styles.input}
                  value={plannedWorkoutName}
                  onChangeText={setPlannedWorkoutName}
                  placeholder="e.g., Chest Day"
                  placeholderTextColor={themeColors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.inputLabel}>WORKOUT TYPE</Text>
                <View style={styles.typeButtons}>
                  {['Strength', 'Running', 'Cycling', 'Swimming'].map(type => (
                    <Pressable
                      key={type}
                      style={[
                        styles.typeButton,
                        plannedWorkoutType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => handleWorkoutTypeChange(type)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        plannedWorkoutType === type && styles.typeButtonTextActive,
                      ]}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Exercises/Sessions Section */}
                <View style={styles.exercisesSection}>
                  <View style={styles.exercisesSectionHeader}>
                    <Text style={styles.inputLabel}>
                      {isCardioType(plannedWorkoutType) ? 'SESSIONS' : 'EXERCISES'}
                    </Text>
                    <Text style={styles.exercisesSectionSubtitle}>
                      {isCardioType(plannedWorkoutType) ? 'Add sessions and set distance' : 'Add exercises and optionally set target weights'}
                    </Text>
                  </View>

                  {plannedExercises.length > 0 ? (
                    <View style={styles.plannedExercisesList}>
                      {plannedExercises.map((exercise, index) => (
                        <View key={index} style={styles.plannedExerciseItem}>
                          <View style={styles.plannedExerciseHeader}>
                            <View style={styles.plannedExerciseInfo}>
                              {isCardioType(plannedWorkoutType) ? (
                                <Activity size={16} color={themeColors.accent.primary} strokeWidth={2} />
                              ) : (
                                <Dumbbell size={16} color={themeColors.accent.primary} strokeWidth={2} />
                              )}
                              <Text style={styles.plannedExerciseName}>{exercise.name}</Text>
                            </View>
                            <Pressable
                              onPress={() => removeExerciseFromPlanned(index)}
                              style={styles.removeExerciseButton}
                              hitSlop={12}
                              accessibilityLabel={`Remove ${exercise.name}`}
                              accessibilityRole="button"
                            >
                              <Trash2 size={16} color={themeColors.error} />
                            </Pressable>
                          </View>
                          {isCardioType(plannedWorkoutType) ? (
                            <View style={styles.distanceInputContainer}>
                              <TextInput
                                style={styles.distanceInput}
                                value={exercise.distance ? exercise.distance.toString() : ''}
                                onChangeText={(val) => updateExerciseDistance(index, val)}
                                keyboardType="decimal-pad"
                                placeholder="0"
                                placeholderTextColor={themeColors.text.tertiary}
                              />
                              <Text style={styles.distanceUnit}>mi</Text>
                            </View>
                          ) : (
                            /* Strength exercise - show sets with weight inputs vertically */
                            <View style={styles.plannedSetsContainer}>
                              {(exercise.sets || []).length > 0 && (
                                <View style={styles.plannedSetsList}>
                                  {exercise.sets.map((set, setIndex) => (
                                    <View key={setIndex} style={styles.plannedSetRow}>
                                      <Text style={styles.plannedSetLabel}>Set {setIndex + 1}</Text>
                                      <View style={styles.plannedSetInputContainer}>
                                        <TextInput
                                          style={styles.plannedSetInput}
                                          value={set.weight?.toString() || ''}
                                          onChangeText={(val) => updatePlannedSetWeight(index, setIndex, val)}
                                          keyboardType="decimal-pad"
                                          placeholder="0"
                                          placeholderTextColor={themeColors.text.tertiary}
                                        />
                                        <Text style={styles.plannedSetUnit}>lb</Text>
                                      </View>
                                      <Pressable
                                        onPress={() => removeSetFromPlannedExercise(index, setIndex)}
                                        style={styles.removeSetButton}
                                        hitSlop={12}
                                      >
                                        <X size={14} color={themeColors.text.tertiary} />
                                      </Pressable>
                                    </View>
                                  ))}
                                </View>
                              )}
                              <Pressable
                                onPress={() => addSetToPlannedExercise(index)}
                                style={styles.addSetButton}
                              >
                                <Plus size={14} color={themeColors.accent.primary} strokeWidth={2.5} />
                                <Text style={styles.addSetText}>
                                  {(exercise.sets || []).length === 0 ? 'Add Sets (optional)' : 'Add Set'}
                                </Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noExercisesPlanned}>
                      {isCardioType(plannedWorkoutType) ? (
                        <Activity size={24} color={themeColors.text.tertiary} />
                      ) : (
                        <Dumbbell size={24} color={themeColors.text.tertiary} />
                      )}
                      <Text style={styles.noExercisesText}>
                        {isCardioType(plannedWorkoutType) ? 'No sessions added yet' : 'No exercises added yet'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      if (isCardioType(plannedWorkoutType)) {
                        // For cardio, add a session directly with the workout type name
                        addExerciseToPlanned(plannedWorkoutType);
                      } else {
                        openExercisePicker();
                      }
                    }}
                    style={styles.addExerciseButton}
                    activeOpacity={0.7}
                  >
                    <Plus size={18} color={themeColors.accent.primary} strokeWidth={2.5} />
                    <Text style={styles.addExerciseButtonText}>
                      {isCardioType(plannedWorkoutType) ? 'Add Session' : 'Add Exercise'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>

              <View style={styles.planModalFooter}>
                <Pressable onPress={handlePlanWorkout} style={styles.planWorkoutButton}>
                  <Text style={styles.planWorkoutButtonText}>
                    {editingWorkout ? 'Save Changes' : 'Plan Workout'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Workout Detail Modal */}
      <Modal
        visible={showWorkoutDetail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkoutDetail(null)}
      >
        <TouchableWithoutFeedback onPress={() => setShowWorkoutDetail(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {showWorkoutDetail?.name?.toUpperCase() || 'WORKOUT'}
                  </Text>
                  <Pressable onPress={() => setShowWorkoutDetail(null)}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                {/* Status */}
                <View style={styles.workoutDetailStatus}>
                  <View style={[
                    styles.statusIndicator,
                    showWorkoutDetail?.completed && styles.statusIndicatorComplete,
                  ]}>
                    {showWorkoutDetail?.completed ? (
                      <Check size={16} color={themeColors.text.inverse} strokeWidth={3} />
                    ) : (
                      <Clock size={16} color={themeColors.text.tertiary} />
                    )}
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={[
                      styles.statusText,
                      showWorkoutDetail?.completed && styles.statusTextComplete,
                    ]}>
                      {showWorkoutDetail?.completed ? 'Completed' : 'Not Completed'}
                    </Text>
                    <Text style={styles.statusSubtext}>
                      {showWorkoutDetail?.workoutType} • {showWorkoutDetail?.dayOfWeek !== undefined ? DAY_NAMES[showWorkoutDetail.dayOfWeek] : ''}
                    </Text>
                  </View>
                </View>

                {/* Exercises List */}
                {showWorkoutDetail?.exercises?.length > 0 && (
                  <View style={styles.detailExercisesList}>
                    <Text style={styles.detailExercisesTitle}>PLANNED EXERCISES</Text>
                    {showWorkoutDetail.exercises.map((exercise, idx) => (
                      <View key={idx} style={styles.detailExerciseItem}>
                        <Dumbbell size={14} color={themeColors.accent.primary} />
                        <Text style={styles.detailExerciseName}>{exercise.name}</Text>
                        {exercise.distance > 0 && (
                          <Text style={styles.detailExerciseDistance}>{exercise.distance} mi</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.detailActionButtons}>
                  <Pressable
                    onPress={() => openEditWorkout(showWorkoutDetail)}
                    style={styles.editWorkoutButton}
                  >
                    <Edit3 size={18} color={themeColors.accent.primary} strokeWidth={2} />
                    <Text style={styles.editWorkoutText}>Edit Workout</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Delete Planned Workout',
                        `Remove "${showWorkoutDetail?.name}" from your weekly plan?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await handleRemovePlannedWorkout(showWorkoutDetail?.id);
                              setShowWorkoutDetail(null);
                            },
                          },
                        ]
                      );
                    }}
                    style={styles.deleteWorkoutButton}
                  >
                    <Trash2 size={18} color={themeColors.error} strokeWidth={2} />
                    <Text style={styles.deleteWorkoutText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Log Weight Modal */}
      <Modal
        visible={showWeightEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightEntry(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>LOG WEIGHT</Text>
                  <Pressable onPress={() => setShowWeightEntry(false)}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>DATE</Text>
                <View style={styles.dateSelector}>
                  <Pressable
                    style={styles.dateSelectorButton}
                    onPress={() => {
                      const newDate = new Date(weightEntryDate);
                      newDate.setDate(newDate.getDate() - 1);
                      setWeightEntryDate(newDate);
                    }}
                  >
                    <ChevronLeft size={20} color={themeColors.text.secondary} />
                  </Pressable>
                  <View style={styles.dateSelectorCenter}>
                    <Calendar size={16} color={themeColors.accent.primary} strokeWidth={2} />
                    <Text style={styles.dateSelectorText}>{formatDateDisplay(weightEntryDate)}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.dateSelectorButton,
                      isWeightDateToday && styles.dateSelectorButtonDisabled
                    ]}
                    onPress={() => {
                      if (!isWeightDateToday) {
                        const newDate = new Date(weightEntryDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setWeightEntryDate(newDate);
                      }
                    }}
                    disabled={isWeightDateToday}
                  >
                    <ChevronRight size={20} color={isWeightDateToday ? COLORS.text.tertiary : COLORS.text.secondary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>WEIGHT ({weightData?.settings?.unit || 'lbs'})</Text>
                <TextInput
                  style={styles.input}
                  value={weightEntry}
                  onChangeText={setWeightEntry}
                  keyboardType="decimal-pad"
                  placeholder="185.0"
                  placeholderTextColor={themeColors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={weightEntryNotes}
                  onChangeText={setWeightEntryNotes}
                  placeholder="How are you feeling today?"
                  placeholderTextColor={themeColors.text.tertiary}
                  multiline
                  numberOfLines={2}
                />

                <Text style={styles.inputLabel}>PHOTO (OPTIONAL)</Text>
                <View style={styles.weightMediaContainer}>
                  {weightEntryMedia.map((media) => (
                    <Pressable
                      key={media.id}
                      onLongPress={() => handleRemoveWeightMedia(media.id)}
                      onPress={() => setShowWeightMediaViewer(media)}
                      style={styles.weightMediaThumbnail}
                    >
                      <RNImage source={{ uri: media.uri }} style={styles.weightMediaImage} />
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleAddWeightMedia}
                    style={styles.addWeightMediaButton}
                  >
                    <Camera size={24} color={themeColors.text.secondary} strokeWidth={2} />
                  </Pressable>
                </View>

                <Pressable onPress={handleLogWeight} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Log Weight</Text>
                </Pressable>

                {!weightData?.goal && (
                  <Pressable
                    onPress={() => {
                      setShowWeightEntry(false);
                      setShowWeightGoal(true);
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Set Weight Goal</Text>
                  </Pressable>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Set Weight Goal Modal */}
      <Modal
        visible={showWeightGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightGoal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>SET WEIGHT GOAL</Text>
                  <Pressable onPress={() => setShowWeightGoal(false)}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>DIRECTION</Text>
                <View style={styles.typeButtons}>
                  {[
                    { value: 'lose', label: 'Lose Weight' },
                    { value: 'gain', label: 'Gain Weight' },
                    { value: 'maintain', label: 'Maintain' },
                  ].map(dir => (
                    <Pressable
                      key={dir.value}
                      style={[
                        styles.typeButton,
                        weightDirection === dir.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setWeightDirection(dir.value)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        weightDirection === dir.value && styles.typeButtonTextActive,
                      ]}>
                        {dir.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>TARGET WEIGHT ({weightData?.settings?.unit || 'lbs'})</Text>
                <TextInput
                  style={styles.input}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                  placeholder="175.0"
                  placeholderTextColor={themeColors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Pressable onPress={handleSetWeightGoal} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Set Goal</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Weight History Modal */}
      <Modal
        visible={showWeightHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeightHistory(false)}
      >
        <SafeAreaView style={styles.historyModal} edges={['top', 'bottom']}>
          <View style={styles.historyHeader}>
            <View style={styles.modalHandle} />
            <View style={styles.historyTitleRow}>
              <Text style={styles.historyTitle}>WEIGHT HISTORY</Text>
              <Pressable onPress={() => setShowWeightHistory(false)} style={styles.historyClose}>
                <X size={24} color={themeColors.text.primary} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {weightData?.entries?.length > 0 ? (
              weightData.entries.map((entry, index) => {
                const prevEntry = weightData.entries[index + 1];
                const change = prevEntry ? entry.weight - prevEntry.weight : 0;

                return (
                  <View key={entry.id} style={styles.historyItem}>
                    <View style={styles.historyItemMain}>
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyDate}>
                          {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        {entry.notes && (
                          <Text style={styles.historyNotes} numberOfLines={1}>
                            {entry.notes}
                          </Text>
                        )}
                      </View>
                      <View style={styles.historyItemRight}>
                        <Text style={styles.historyWeight}>
                          {formatWeight(entry.weight, weightData?.settings?.unit || 'lbs')}
                        </Text>
                        {change !== 0 && (
                          <Text style={[
                            styles.historyChange,
                            change < 0 ? styles.historyChangeDown : styles.historyChangeUp
                          ]}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            'Delete Entry',
                            'Are you sure you want to delete this weight entry?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteWeightEntry(entry.id);
                                  await loadData();
                                }
                              }
                            ]
                          );
                        }}
                        style={styles.historyDelete}
                        hitSlop={12}
                      >
                        <Trash2 size={16} color={themeColors.text.tertiary} />
                      </Pressable>
                    </View>
                    {entry.media && entry.media.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.historyMediaRow}
                      >
                        {entry.media.map((media) => (
                          <Pressable
                            key={media.id}
                            onPress={() => setShowWeightMediaViewer(media)}
                            style={styles.historyMediaThumb}
                          >
                            <RNImage source={{ uri: media.uri }} style={styles.historyMediaImage} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.historyEmpty}>
                <Scale size={32} color={themeColors.text.tertiary} />
                <Text style={styles.historyEmptyText}>No weight entries yet</Text>
              </View>
            )}
            <View style={{ height: 50 }} />
          </ScrollView>

          <View style={styles.historyFooter}>
            <Pressable
              onPress={() => {
                setShowWeightHistory(false);
                setShowWeightEntry(true);
              }}
              style={styles.historyAddButton}
            >
              <Plus size={18} color={themeColors.text.inverse} />
              <Text style={styles.historyAddButtonText}>Log Weight</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Templates Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>WEEKLY PLAN TEMPLATES</Text>
                  <Pressable onPress={() => setShowTemplateModal(false)}>
                    <X size={24} color={themeColors.text.primary} />
                  </Pressable>
                </View>

                {/* Save Current Plan */}
                {goals?.plannedWorkouts?.length > 0 && (
                  <View style={styles.templateSaveSection}>
                    <Text style={[styles.inputLabel, { marginBottom: SPACING.xs }]}>SAVE CURRENT PLAN</Text>
                    <View style={styles.templateSaveRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={templateName}
                        onChangeText={setTemplateName}
                        placeholder="Template name"
                        placeholderTextColor={themeColors.text.tertiary}
                      />
                      <Pressable
                        onPress={handleSaveTemplate}
                        style={[styles.templateSaveButton, { backgroundColor: themeColors.accent.primary }]}
                      >
                        <Save size={18} color={themeColors.text.inverse} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Saved Templates */}
                <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>SAVED TEMPLATES</Text>
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <View key={template.id} style={[styles.templateItem, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                        <Pressable
                          style={styles.templateInfo}
                          onPress={() => handleApplyTemplate(template)}
                        >
                          <Text style={[styles.templateName, { color: themeColors.text.primary }]}>{template.name}</Text>
                          <Text style={[styles.templateMeta, { color: themeColors.text.tertiary }]}>
                            {template.workouts.length} workout{template.workouts.length !== 1 ? 's' : ''}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteTemplate(template.id)}
                          hitSlop={8}
                        >
                          <Trash2 size={16} color={themeColors.text.tertiary} />
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <View style={styles.templateEmpty}>
                      <BookOpen size={24} color={themeColors.text.tertiary} />
                      <Text style={[styles.templateEmptyText, { color: themeColors.text.tertiary }]}>
                        No templates saved yet
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Weight Media Viewer Modal */}
      <Modal
        visible={!!showWeightMediaViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightMediaViewer(null)}
      >
        <Pressable
          style={styles.weightMediaViewerOverlay}
          onPress={() => setShowWeightMediaViewer(null)}
        >
          {showWeightMediaViewer && (
            <RNImage
              source={{ uri: showWeightMediaViewer.uri }}
              style={styles.weightMediaViewerImage}
            />
          )}
          <Pressable
            style={styles.weightMediaViewerClose}
            onPress={() => setShowWeightMediaViewer(null)}
          >
            <X size={28} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  weekArrow: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  weekText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 16,
    minWidth: 120,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },

  // Progress Ring Card
  progressRingCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  // Section
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week Plan
  weekPlanCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  dayRowToday: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  dayRowWithPlans: {
    paddingVertical: SPACING.sm,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    flex: 1,
  },
  plannedList: {
    flex: 1,
    gap: SPACING.xs,
  },
  dayName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    width: 40,
  },
  dayNameToday: {
    color: COLORS.accent.primary,
  },
  plannedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  completedIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.text.tertiary,
  },
  plannedName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  plannedNameComplete: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
  },
  restDay: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  removeButtonInline: {
    marginLeft: SPACING.xs,
    padding: 2,
  },
  addPlanButton: {
    padding: SPACING.xs,
    opacity: 0.5,
  },

  // Goals Card
  goalsCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  goalItem: {
    paddingVertical: SPACING.sm,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  goalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckboxComplete: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  goalLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  goalLabelComplete: {
    color: COLORS.success,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: 28,
  },
  goalProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.full,
  },
  goalProgressComplete: {
    backgroundColor: COLORS.success,
  },
  goalCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    minWidth: 32,
  },
  goalRemove: {
    padding: SPACING.xs,
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    borderStyle: 'dashed',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },

  // Weight Card
  weightCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  weightCurrent: {
    alignItems: 'center',
  },
  weightTarget: {
    alignItems: 'center',
  },
  weightValue: {
    ...TYPOGRAPHY.statSmall,
    color: COLORS.text.primary,
  },
  weightLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  weightArrow: {
    flex: 1,
    alignItems: 'center',
  },
  weightArrowText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.tertiary,
  },
  weightProgressBar: {
    height: 8,
    backgroundColor: COLORS.surface.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  weightProgressFill: {
    height: '100%',
    backgroundColor: COLORS.tertiary.primary,
    borderRadius: RADIUS.full,
  },
  weightProgressComplete: {
    backgroundColor: COLORS.success,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  weightStat: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  logWeightButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  logWeightText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  weightCardNoGoal: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  currentWeightLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  currentWeightValue: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  weightActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  weightActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent.primaryDim,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  weightActionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
  weightGoalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  weightGoalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  weightGoalActionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  inputLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  typeButtonActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  typeButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  typeButtonTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  presetLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetButton: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  presetText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  modalButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Workout Detail Modal
  workoutDetailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicatorComplete: {
    backgroundColor: COLORS.success,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  statusTextComplete: {
    color: COLORS.success,
  },
  statusSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  deleteWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.2)',
  },
  deleteWorkoutText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    marginBottom: SPACING.md,
  },
  dateSelectorButton: {
    padding: SPACING.md,
  },
  dateSelectorButtonDisabled: {
    opacity: 0.3,
  },
  dateSelectorCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    justifyContent: 'center',
  },
  dateSelectorText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },

  // Weight Card Actions
  weightCardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  viewHistoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  viewHistoryText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // Weight History Modal
  historyModal: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  historyHeader: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  historyTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  historyClose: {
    padding: SPACING.xs,
  },
  historyList: {
    flex: 1,
    padding: SPACING.lg,
  },
  historyItem: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyMediaRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
  },
  historyMediaThumb: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginRight: SPACING.xs,
  },
  historyMediaImage: {
    width: '100%',
    height: '100%',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  historyNotes: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    marginRight: SPACING.md,
  },
  historyWeight: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 16,
  },
  historyChange: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  historyChangeUp: {
    color: COLORS.error,
  },
  historyChangeDown: {
    color: COLORS.success,
  },
  historyDelete: {
    padding: SPACING.xs,
  },
  historyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  historyEmptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  historyFooter: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    backgroundColor: COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  historyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  historyAddButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Modal Handle (for sheet modals)
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    alignSelf: 'center',
  },

  // Plan Modal (Full Screen)
  planModal: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  planModalHeader: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  planModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  planModalTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  planModalClose: {
    padding: SPACING.xs,
  },
  planModalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  planModalFooter: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  planWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
  },
  planWorkoutButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // Exercises Section
  exercisesSection: {
    marginTop: SPACING.xl,
  },
  exercisesSectionHeader: {
    marginBottom: SPACING.md,
  },
  exercisesSectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  plannedExercisesList: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  plannedExerciseItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  plannedExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  plannedExerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  plannedExerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    width: 80,
  },
  distanceInput: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  distanceUnit: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: SPACING.xs,
  },
  removeExerciseButton: {
    padding: SPACING.xs,
  },

  // Planned Sets (for strength exercises)
  plannedSetsContainer: {
    marginTop: SPACING.sm,
  },
  plannedSetsList: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  plannedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  plannedSetLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    width: 40,
  },
  plannedSetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    width: 80,
  },
  plannedSetInput: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  plannedSetUnit: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  removeSetButton: {
    padding: SPACING.xs,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  addSetText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  noExercisesPlanned: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  noExercisesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
  },
  addExerciseButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },

  // Exercise Picker Modal
  exercisePickerModal: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  exercisePickerHeader: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  exercisePickerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  exerciseSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    gap: SPACING.sm,
  },
  exerciseSearchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  clearSearchButton: {
    padding: SPACING.xs,
  },
  categoryScroll: {
    marginTop: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  categoryChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  categoryChipTextActive: {
    color: COLORS.accent.primary,
  },
  exercisePickerList: {
    flex: 1,
    padding: SPACING.lg,
  },
  exercisePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  exercisePickerItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  noExercisesFound: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  noExercisesFoundText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Category Grid Styles (matching WorkoutBuilder)
  browseCategoriesTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryGridButton: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    width: '48%',
  },
  categoryGridButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  backToCategoriesButton: {
    marginBottom: SPACING.lg,
  },
  backToCategoriesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent.primary,
  },

  // Workout Detail Modal Updates
  detailExercisesList: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  detailExercisesTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  detailExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  detailExerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  detailExerciseDistance: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editWorkoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
  },
  editWorkoutText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // Plan Actions Row
  planActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  planActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  planActionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  // Template Modal
  templateSaveSection: {
    marginBottom: SPACING.md,
  },
  templateSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  templateSaveButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  templateInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  templateName: {
    ...TYPOGRAPHY.bodyBold,
  },
  templateMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  templateEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  templateEmptyText: {
    ...TYPOGRAPHY.body,
  },

  // Weight Media
  weightMediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  weightMediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  weightMediaImage: {
    width: '100%',
    height: '100%',
  },
  addWeightMediaButton: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightMediaViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
