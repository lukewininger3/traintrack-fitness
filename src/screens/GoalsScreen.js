import { Calendar, Check, ChevronLeft, ChevronRight, Clock, Plus, Scale, Target, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
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
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import {
  loadWeeklyGoals,
  saveWeeklyGoals,
  createDefaultGoals,
  getWeekStart,
  formatWeekRange,
  DAY_NAMES,
  updateGoalProgress,
  GOAL_PRESETS,
  addPlannedWorkout,
  removePlannedWorkout,
  getDateFromDayOfWeek,
} from '../utils/goalsStorage';
import WeeklyPlanCard from '../components/WeeklyPlanCard';
import WorkoutProgressRing from '../components/WorkoutProgressRing';
import {
  loadWeightData,
  addWeightEntry,
  deleteWeightEntry,
  setWeightGoal,
  calculateWeightProgress,
  formatWeight,
  formatWeightChange,
  getRecentWeightEntries,
} from '../utils/weightStorage';
import { loadWorkouts } from '../utils/storage';

export default function GoalsScreen() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [goals, setGoals] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [weightData, setWeightData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showPlanDay, setShowPlanDay] = useState(null); // day index
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [showWeightGoal, setShowWeightGoal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);

  // Form states
  const [newGoalType, setNewGoalType] = useState('count');
  const [newGoalTarget, setNewGoalTarget] = useState('4');
  const [newGoalWorkoutType, setNewGoalWorkoutType] = useState('Strength');
  const [plannedWorkoutName, setPlannedWorkoutName] = useState('');
  const [plannedWorkoutType, setPlannedWorkoutType] = useState('Strength');
  const [weightEntry, setWeightEntry] = useState('');
  const [weightEntryDate, setWeightEntryDate] = useState(new Date());
  const [targetWeight, setTargetWeight] = useState('');
  const [weightDirection, setWeightDirection] = useState('lose');

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
    setLoading(true);
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
    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const navigateWeek = (direction) => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction * 7));
    setWeekStart(current.toISOString().split('T')[0]);
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

    await addPlannedWorkout(weekStart, {
      dayOfWeek: showPlanDay,
      name: plannedWorkoutName,
      workoutType: plannedWorkoutType,
    });

    await loadData();
    setShowPlanDay(null);
    setPlannedWorkoutName('');
  };

  const handleRemovePlannedWorkout = async (plannedWorkoutId) => {
    await removePlannedWorkout(weekStart, plannedWorkoutId);
    await loadData();
  };

  const handleLogWeight = async () => {
    if (!weightEntry || parseFloat(weightEntry) <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    await addWeightEntry(parseFloat(weightEntry), '', weightEntryDate);
    await loadData();
    setShowWeightEntry(false);
    setWeightEntry('');
    setWeightEntryDate(new Date());
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
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Progress Ring */}
        <View style={styles.progressRingCard}>
          {/* Week Selector */}
          <View style={styles.weekSelector}>
            <Pressable onPress={() => navigateWeek(-1)} style={styles.weekArrow}>
              <ChevronLeft size={20} color={COLORS.text.tertiary} />
            </Pressable>
            <Text style={styles.weekText}>{formatWeekRange(weekStart)}</Text>
            <Pressable onPress={() => navigateWeek(1)} style={styles.weekArrow}>
              <ChevronRight size={20} color={COLORS.text.tertiary} />
            </Pressable>
          </View>
          <WorkoutProgressRing plannedWorkouts={goals?.plannedWorkouts || []} />
        </View>

        {/* Weekly Plan */}
        <View style={styles.section}>
          <WeeklyPlanCard
            weekStart={weekStart}
            getPlannedForDay={getPlannedForDay}
            hasWorkoutOnDay={hasWorkoutOnDay}
            isCurrentWeek={isCurrentWeek}
            today={today}
            onPlanDay={(dayIndex) => setShowPlanDay(dayIndex)}
            onRemoveWorkout={handleRemovePlannedWorkout}
          />
        </View>

        {/* Workout Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WORKOUT GOALS</Text>
            <Pressable onPress={() => setShowAddGoal(true)} style={styles.addButton}>
              <Plus size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {goals?.goals?.length > 0 ? (
            <View style={styles.goalsCard}>
              {goals.goals.map((goal) => (
                <View key={goal.id} style={styles.goalItem}>
                  <View style={styles.goalInfo}>
                    <View style={[
                      styles.goalCheckbox,
                      goal.completed && styles.goalCheckboxComplete,
                    ]}>
                      {goal.completed && (
                        <Check size={12} color={COLORS.text.inverse} strokeWidth={3} />
                      )}
                    </View>
                    <Text style={[
                      styles.goalLabel,
                      goal.completed && styles.goalLabelComplete,
                    ]}>
                      {goal.label}
                    </Text>
                  </View>
                  <View style={styles.goalProgress}>
                    <View style={styles.goalProgressBar}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          { width: `${Math.min(100, (goal.current / goal.target) * 100)}%` },
                          goal.completed && styles.goalProgressComplete,
                        ]}
                      />
                    </View>
                    <Text style={styles.goalCount}>
                      {goal.current}/{goal.target}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveGoal(goal.id)}
                      style={styles.goalRemove}
                    >
                      <Trash2 size={14} color={COLORS.text.tertiary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={styles.emptyCard} onPress={() => setShowAddGoal(true)}>
              <Target size={24} color={COLORS.text.tertiary} />
              <Text style={styles.emptyText}>No goals set</Text>
              <Text style={styles.emptySubtext}>Tap to add a workout goal</Text>
            </Pressable>
          )}
        </View>

        {/* Weight Goal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WEIGHT GOAL</Text>
            {weightData?.goal && (
              <Pressable onPress={() => setShowWeightEntry(true)} style={styles.addButton}>
                <Plus size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {weightProgress ? (
            <Pressable style={styles.weightCard} onPress={() => setShowWeightHistory(true)}>
              <View style={styles.weightHeader}>
                <View style={styles.weightCurrent}>
                  <Text style={styles.weightValue}>
                    {formatWeight(weightProgress.currentWeight, weightData?.settings?.unit || 'lbs')}
                  </Text>
                  <Text style={styles.weightLabel}>CURRENT</Text>
                </View>
                <View style={styles.weightArrow}>
                  <Text style={styles.weightArrowText}>→</Text>
                </View>
                <View style={styles.weightTarget}>
                  <Text style={styles.weightValue}>
                    {formatWeight(weightProgress.targetWeight, weightData?.settings?.unit || 'lbs')}
                  </Text>
                  <Text style={styles.weightLabel}>GOAL</Text>
                </View>
              </View>

              <View style={styles.weightProgressBar}>
                <View
                  style={[
                    styles.weightProgressFill,
                    { width: `${weightProgress.progress}%` },
                    weightProgress.isComplete && styles.weightProgressComplete,
                  ]}
                />
              </View>

              <View style={styles.weightStats}>
                <Text style={styles.weightStat}>
                  {weightProgress.changed.toFixed(1)} {weightData?.settings?.unit || 'lbs'} {weightProgress.direction === 'lose' ? 'lost' : 'gained'}
                </Text>
                <Text style={styles.weightStat}>
                  {weightProgress.remaining.toFixed(1)} {weightData?.settings?.unit || 'lbs'} to go
                </Text>
              </View>

              <View style={styles.weightCardActions}>
                <Pressable onPress={() => setShowWeightEntry(true)} style={styles.logWeightButton}>
                  <Scale size={16} color={COLORS.accent.primary} />
                  <Text style={styles.logWeightText}>Log Weight</Text>
                </Pressable>
                <Pressable onPress={() => setShowWeightHistory(true)} style={styles.viewHistoryButton}>
                  <Clock size={16} color={COLORS.text.secondary} />
                  <Text style={styles.viewHistoryText}>History</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : weightData?.entries?.length > 0 ? (
            <Pressable style={styles.weightCardNoGoal} onPress={() => setShowWeightHistory(true)}>
              <Text style={styles.currentWeightLabel}>Current Weight</Text>
              <Text style={styles.currentWeightValue}>
                {formatWeight(weightData.entries[0]?.weight, weightData?.settings?.unit || 'lbs')}
              </Text>
              <View style={styles.weightActions}>
                <Pressable onPress={() => setShowWeightEntry(true)} style={styles.weightActionButton}>
                  <Plus size={14} color={COLORS.accent.primary} />
                  <Text style={styles.weightActionText}>Log</Text>
                </Pressable>
                <Pressable onPress={() => setShowWeightGoal(true)} style={styles.weightActionButton}>
                  <Target size={14} color={COLORS.accent.primary} />
                  <Text style={styles.weightActionText}>Set Goal</Text>
                </Pressable>
                <Pressable onPress={() => setShowWeightHistory(true)} style={styles.weightActionButton}>
                  <Clock size={14} color={COLORS.accent.primary} />
                  <Text style={styles.weightActionText}>History</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <Pressable style={styles.emptyCard} onPress={() => setShowWeightEntry(true)}>
              <Scale size={24} color={COLORS.text.tertiary} />
              <Text style={styles.emptyText}>No weight logged</Text>
              <Text style={styles.emptySubtext}>Tap to log your weight</Text>
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
                    <X size={24} color={COLORS.text.primary} />
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
                  placeholderTextColor={COLORS.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.presetLabel}>PRESETS</Text>
                <View style={styles.presets}>
                  {GOAL_PRESETS.slice(0, 4).map((preset, index) => (
                    <Pressable
                      key={index}
                      style={styles.presetButton}
                      onPress={() => {
                        setNewGoalType(preset.type);
                        setNewGoalTarget(preset.target.toString());
                        if (preset.workoutType) setNewGoalWorkoutType(preset.workoutType);
                      }}
                    >
                      <Text style={styles.presetText}>{preset.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable onPress={handleAddGoal} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Add Goal</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Plan Day Modal */}
      <Modal
        visible={showPlanDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlanDay(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    PLAN {showPlanDay !== null ? DAY_NAMES[showPlanDay].toUpperCase() : ''}
                  </Text>
                  <Pressable onPress={() => setShowPlanDay(null)}>
                    <X size={24} color={COLORS.text.primary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>WORKOUT NAME</Text>
                <TextInput
                  style={styles.input}
                  value={plannedWorkoutName}
                  onChangeText={setPlannedWorkoutName}
                  placeholder="e.g., Chest Day"
                  placeholderTextColor={COLORS.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.inputLabel}>WORKOUT TYPE</Text>
                <View style={styles.typeButtons}>
                  {['Strength', 'Running', 'Cycling', 'Swimming', 'Other'].map(type => (
                    <Pressable
                      key={type}
                      style={[
                        styles.typeButton,
                        plannedWorkoutType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setPlannedWorkoutType(type)}
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

                <Pressable onPress={handlePlanWorkout} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Plan Workout</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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
                    <X size={24} color={COLORS.text.primary} />
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
                    <ChevronLeft size={20} color={COLORS.text.secondary} />
                  </Pressable>
                  <View style={styles.dateSelectorCenter}>
                    <Calendar size={16} color={COLORS.accent.primary} strokeWidth={2} />
                    <Text style={styles.dateSelectorText}>{formatDateDisplay(weightEntryDate)}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.dateSelectorButton,
                      weightEntryDate >= new Date() && styles.dateSelectorButtonDisabled
                    ]}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      if (weightEntryDate < today) {
                        const newDate = new Date(weightEntryDate);
                        newDate.setDate(newDate.getDate() + 1);
                        if (newDate <= today) {
                          setWeightEntryDate(newDate);
                        }
                      }
                    }}
                    disabled={weightEntryDate >= new Date()}
                  >
                    <ChevronRight size={20} color={weightEntryDate >= new Date() ? COLORS.text.tertiary : COLORS.text.secondary} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>WEIGHT ({weightData?.settings?.unit || 'lbs'})</Text>
                <TextInput
                  style={styles.input}
                  value={weightEntry}
                  onChangeText={setWeightEntry}
                  keyboardType="decimal-pad"
                  placeholder="185.0"
                  placeholderTextColor={COLORS.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

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
                    <X size={24} color={COLORS.text.primary} />
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
                  placeholderTextColor={COLORS.text.tertiary}
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
        <View style={styles.historyModal}>
          <View style={styles.historyHeader}>
            <View style={styles.modalHandle} />
            <View style={styles.historyTitleRow}>
              <Text style={styles.historyTitle}>WEIGHT HISTORY</Text>
              <Pressable onPress={() => setShowWeightHistory(false)} style={styles.historyClose}>
                <X size={24} color={COLORS.text.primary} />
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
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={COLORS.text.tertiary} />
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.historyEmpty}>
                <Scale size={32} color={COLORS.text.tertiary} />
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
              <Plus size={18} color={COLORS.text.inverse} />
              <Text style={styles.historyAddButtonText}>Log Weight</Text>
            </Pressable>
          </View>
        </View>
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
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
    paddingVertical: SPACING.md,
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
    marginTop: SPACING.xl,
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
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  modalButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
});
