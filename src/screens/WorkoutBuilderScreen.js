import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Award, FileText, MessageSquare, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { EXERCISE_DATABASE, getAllCategories, searchBuiltInExercises } from '../constants/workoutTypes';
import { exerciseExists, loadCustomExercises, saveCustomExercise } from '../utils/customExercises';
import { saveAsTemplate } from '../utils/workoutTemplates';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import RestTimerButton from '../components/RestTimer';
import { useTimer } from '../contexts/TimerContext';
import CustomExerciseForm from './WorkoutBuilder/components/CustomExerciseForm';
import ExerciseCard from './WorkoutBuilder/components/ExerciseCard';
import ExerciseSetInput from './WorkoutBuilder/components/ExerciseSetInput';
import PreviousSessionBanner from './WorkoutBuilder/components/PreviousSessionBanner';
import { useWorkoutForm } from './WorkoutBuilder/hooks/useWorkoutForm';

export default function WorkoutBuilderScreen() {
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const templateId = params?.templateId;
  const repeatData = params?.repeatData;
  const workoutDetails = params?.workoutDetails;
  const scrollViewRef = useRef(null);
  const setRefs = useRef([]);

  // Use the workout form hook for state management
  const {
    workout,
    isSaving,
    isCardioWorkoutType,
    isCardioExercise,
    setWorkout,
    saveWorkoutData,
    findPreviousSession,
  } = useWorkoutForm({ editingWorkoutId, templateId, repeatData, workoutDetails });

  // Timer for auto-start after logging sets
  const { onSetLogged, reset: resetTimer } = useTimer();

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  const [currentExercise, setCurrentExercise] = useState({
    name: '',
    sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }],
    notes: ''
  });

  const [previousSession, setPreviousSession] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [editingCustomExercise, setEditingCustomExercise] = useState(null);
  const [customExerciseScreen, setCustomExerciseScreen] = useState(null);

  // PR Celebration state
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [newPRs, setNewPRs] = useState([]);

  // PR celebration animation values
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(0);
  const trophyGlow = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const prListOpacity = useSharedValue(0);

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value}deg` },
    ],
  }));

  const trophyGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: trophyGlow.value,
    shadowRadius: 20 * trophyGlow.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleScale.value,
  }));

  const prListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: prListOpacity.value,
  }));

  const triggerPRCelebration = () => {
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate trophy with bounce
    trophyScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );

    // Slight wobble effect
    trophyRotate.value = withSequence(
      withDelay(100, withSpring(-5, { damping: 10 })),
      withSpring(5, { damping: 10 }),
      withSpring(0, { damping: 15 })
    );

    // Glow pulse
    trophyGlow.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(0.4, { damping: 15 })
    );

    // Title bounce in
    titleScale.value = withDelay(150, withSequence(
      withSpring(1.1, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 15 })
    ));

    // Fade in the PR list
    prListOpacity.value = withDelay(300, withSpring(1));
  };

  const resetPRCelebration = () => {
    trophyScale.value = 0;
    trophyRotate.value = 0;
    trophyGlow.value = 0;
    titleScale.value = 0;
    prListOpacity.value = 0;
  };

  const closePRCelebration = () => {
    setShowPRCelebration(false);
    resetPRCelebration();
    // Small delay to ensure modal fully closes before navigation
    setTimeout(() => {
      navigateToActivities();
    }, 100);
  };

  const navigateBack = () => {
    // Cancel exits completely without saving - reset timer and go to activities
    resetTimer();
    router.replace('/activities');
  };

  const navigateToEditDetails = () => {
    // Navigate back to workout details to edit name/type/date
    router.push({
      pathname: '/workout-details',
      params: {
        workoutId: editingWorkoutId,
        templateId: templateId,
        repeatData: repeatData,
        // Pass current workout state so details can be edited
        editingDetails: JSON.stringify({
          name: workout.name,
          type: workout.type,
          date: workout.date,
          time: workout.time,
          notes: workout.notes,
        }),
        // Pass exercises so save button can appear on details screen
        existingExercises: JSON.stringify(workout.exercises),
      }
    });
  };

  const navigateToActivities = () => {
    // Reset timer and go to Activities after saving
    resetTimer();
    router.replace({
      pathname: '/activities',
      params: { refresh: Date.now() }
    });
  };


  const handleSaveCustomExercise = async (name, category) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return false;
    }

    const { exists, type } = await exerciseExists(name);
    if (exists && (!editingCustomExercise || editingCustomExercise.name !== name)) {
      Alert.alert('Duplicate Exercise', `This exercise already exists as a ${type} exercise`);
      return false;
    }

    const { data, error } = await saveCustomExercise(name.trim(), category, editingCustomExercise?.id);

    if (error) {
      Alert.alert('Error', error);
      return false;
    }

    await loadCustomExercisesData();
    Alert.alert('Success', editingCustomExercise ? 'Exercise updated!' : 'Exercise created!');
    return true;
  };

  const handleDeleteCustomExercise = (exerciseId, exerciseName) => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exerciseName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { deleteCustomExercise } = await import('../utils/customExercises');
            const { error } = await deleteCustomExercise(exerciseId);

            if (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            } else {
              await loadCustomExercisesData();
              Alert.alert('Success', 'Exercise deleted!');
            }
          }
        }
      ]
    );
  };

  const scrollToSet = (index) => {
    if (setRefs.current[index] && scrollViewRef.current) {
      setTimeout(() => {
        setRefs.current[index].measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 50, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  };


  useEffect(() => {
    loadCustomExercisesData();
  }, []);

  const loadCustomExercisesData = async () => {
    const customs = await loadCustomExercises();
    setCustomExercises(customs);
  };

  const calculatePace = (distance, time) => {
    if (!distance || !time || parseFloat(distance) === 0) return '';
    const paceValue = parseFloat(time) / parseFloat(distance);
    return paceValue.toFixed(2);
  };

  const calculateTime = (distance, pace) => {
    if (!distance || !pace) return '';
    const timeValue = parseFloat(distance) * parseFloat(pace);
    return timeValue.toFixed(2);
  };

  const calculateDistance = (time, pace) => {
    if (!time || !pace || parseFloat(pace) === 0) return '';
    const distanceValue = parseFloat(time) / parseFloat(pace);
    return distanceValue.toFixed(2);
  };

  const updateSetWithCalculation = (index, field, value) => {
    const updated = [...currentExercise.sets];
    updated[index][field] = value;

    const isCurrentExerciseCardio = isCardioWorkoutType(workout.type) || isCardioExercise(currentExercise.name);

    if (isCurrentExerciseCardio) {
      const set = updated[index];

      if (field === 'distance' || field === 'time') {
        if (set.distance && set.time) {
          updated[index].pace = calculatePace(set.distance, set.time);
        }
      } else if (field === 'pace') {
        if (set.distance && set.pace && !set.time) {
          updated[index].time = calculateTime(set.distance, set.pace);
        } else if (set.time && set.pace && !set.distance) {
          updated[index].distance = calculateDistance(set.time, set.pace);
        }
      }
    }

    setCurrentExercise({ ...currentExercise, sets: updated });
  };

  const saveWorkout = async () => {
    try {
      const result = await saveWorkoutData();

      if (!result.success) {
        return;
      }

      if (result.achievedPRs && result.achievedPRs.length > 0) {
        // Show celebration modal
        setNewPRs(result.achievedPRs);
        setShowPRCelebration(true);
        // Trigger animation after modal renders
        setTimeout(() => {
          triggerPRCelebration();
        }, 100);
      } else {
        navigateToActivities();
      }
    } catch (error) {
      console.error('Error in saveWorkout:', error);
      Alert.alert('Error', 'Something went wrong while saving. Please try again.');
    }
  };

  const handleSaveAsTemplate = () => {
    if (workout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise before saving as template');
      return;
    }

    Alert.prompt(
      'Save as Template',
      'Enter a name for this template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (templateName) => {
            if (!templateName?.trim()) {
              Alert.alert('Error', 'Please enter a template name');
              return;
            }
            try {
              await saveAsTemplate(workout, templateName.trim());
              Alert.alert('Success', 'Template saved! You can find it in your Templates.');
            } catch (error) {
              Alert.alert('Error', 'Failed to save template');
            }
          }
        }
      ],
      'plain-text',
      workout.name || ''
    );
  };

  const closeExerciseModal = () => {
    setShowExercisePicker(false);
    setTimeout(() => {
      setCurrentExercise({
        name: '',
        sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }],
        notes: ''
      });
      setPreviousSession(null);
      setSearchQuery('');
      setSelectedMuscleGroup(null);
      setEditingExerciseIndex(null);
    }, 200);
  };

  const addExerciseOrSession = () => {
    const isCurrentCardioWorkout = isCardioWorkoutType(workout.type);
    const isCurrentExerciseCardio = isCardioExercise(currentExercise.name);
    const isCardioEntry = isCurrentCardioWorkout || isCurrentExerciseCardio;

    if (!isCurrentCardioWorkout && !currentExercise.name) {
      Alert.alert('Missing Exercise', 'Please select an exercise');
      return;
    }

    const validSets = currentExercise.sets.filter(set => {
      if (isCardioEntry) {
        const hasDistance = set.distance && parseFloat(set.distance) > 0;
        const hasTime = set.time && parseFloat(set.time) > 0;
        const hasPace = set.pace && parseFloat(set.pace) > 0;
        return (hasDistance && hasTime) || (hasDistance && hasPace) || (hasTime && hasPace);
      } else {
        return set.weight && set.reps;
      }
    });

    if (validSets.length === 0) {
      Alert.alert('Missing Data', 'Please add at least one complete set');
      return;
    }

    const exercise = {
      name: isCurrentCardioWorkout ? `Session ${workout.exercises.length + 1}` : currentExercise.name,
      sets: validSets.map(set => {
        if (isCardioEntry) {
          return {
            distance: parseFloat(set.distance) || 0,
            time: parseFloat(set.time) || 0,
            pace: parseFloat(set.pace) || 0
          };
        } else {
          return {
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0
          };
        }
      }),
      notes: currentExercise.notes
    };

    if (editingExerciseIndex !== null) {
      const updated = [...workout.exercises];
      updated[editingExerciseIndex] = exercise;
      setWorkout({ ...workout, exercises: updated });
    } else {
      setWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
    }

    // Trigger auto-timer if enabled (only for strength exercises, not cardio)
    if (!isCardioEntry && validSets.length > 0) {
      onSetLogged();
    }

    closeExerciseModal();
  };


  const addSet = () => {
    setCurrentExercise({
      ...currentExercise,
      sets: [...currentExercise.sets, { weight: '', reps: '', distance: '', time: '', pace: '' }]
    });
  };

  const removeSet = (index) => {
    const updated = currentExercise.sets.filter((_, i) => i !== index);
    setCurrentExercise({ ...currentExercise, sets: updated });
  };

  const isCurrentCardioWorkout = isCardioWorkoutType(workout.type);

  const sectionLabel = isCurrentCardioWorkout ? 'Sessions' : 'Exercises';
  const addButtonLabel = isCurrentCardioWorkout ? 'Add Session' : 'Add Exercise';
  const emptyStateText = isCurrentCardioWorkout ? 'No sessions yet' : 'No exercises yet';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable
          onPress={navigateBack}
          style={styles.headerButton}
          disabled={isSaving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.headerButtonText, isSaving && { opacity: 0.5 }]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={navigateToEditDetails}
          hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
        >
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{workout.name || 'New Workout'}</Text>
            <Pencil size={14} color={COLORS.text.secondary} strokeWidth={2} />
          </View>
          <Text style={styles.headerSubtitle}>{workout.type} • {workout.date}</Text>
        </Pressable>
        <Pressable
          onPress={saveWorkout}
          style={[styles.saveButtonContainer, isSaving && styles.saveButtonDisabled]}
          disabled={isSaving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{sectionLabel.toUpperCase()}</Text>
            <Pressable
              onPress={async () => {
                setEditingExerciseIndex(null);

                if (isCurrentCardioWorkout) {
                  const sessionName = `${workout.type} Session ${workout.exercises.length + 1}`;
                  const prevSession = await findPreviousSession(workout.type);
                  setPreviousSession(prevSession);
                  setCurrentExercise({
                    name: sessionName,
                    sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }],
                    notes: ''
                  });
                } else {
                  setCurrentExercise({
                    name: '',
                    sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }],
                    notes: ''
                  });
                  setPreviousSession(null);
                }

                setShowExercisePicker(true);
              }}
              style={styles.addButton}
            >
              <Plus size={18} color={COLORS.text.inverse} strokeWidth={2.5} />
              <Text style={styles.addButtonText}>{addButtonLabel}</Text>
            </Pressable>
          </View>

          {workout.exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{emptyStateText}</Text>
              <Text style={styles.emptySubtext}>Tap the button above to get started</Text>
            </View>
          ) : (
            <DraggableFlatList
              data={workout.exercises}
              keyExtractor={(item, index) => `exercise-${index}-${item.name}`}
              onDragBegin={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              onDragEnd={({ data }) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWorkout({ ...workout, exercises: data });
              }}
              renderItem={({ item: exercise, getIndex, drag, isActive }) => {
                const index = getIndex();
                return (
                  <ExerciseCard
                    exercise={exercise}
                    index={index}
                    isCardioWorkout={isCurrentCardioWorkout}
                    drag={drag}
                    isActive={isActive}
                    onEdit={async (idx) => {
                      setEditingExerciseIndex(idx);

                      if (isCurrentCardioWorkout) {
                        const prevSession = await findPreviousSession(workout.type);
                        setPreviousSession(prevSession);
                      }

                      setCurrentExercise({
                        name: exercise.name,
                        sets: exercise.sets.map(s => ({
                          weight: s.weight?.toString() || '',
                          reps: s.reps?.toString() || '',
                          distance: s.distance?.toString() || '',
                          time: s.time?.toString() || '',
                          pace: s.pace?.toString() || ''
                        })),
                        notes: exercise.notes || ''
                      });
                      setShowExercisePicker(true);
                    }}
                    onDelete={(idx) => {
                      const updated = workout.exercises.filter((_, i) => i !== idx);
                      setWorkout({ ...workout, exercises: updated });
                    }}
                  />
                );
              }}
              scrollEnabled={false}
              containerStyle={styles.draggableList}
            />
          )}
        </View>

        {/* Save as Template Button */}
        {workout.exercises.length > 0 && (
          <Pressable onPress={handleSaveAsTemplate} style={styles.templateButton}>
            <FileText size={18} color={COLORS.accent.primary} strokeWidth={2} />
            <Text style={styles.templateButtonText}>Save as Template</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (customExerciseScreen === 'manage') {
            setCustomExerciseScreen(null);
            setEditingCustomExercise(null);
          } else {
            closeExerciseModal();
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.exerciseModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                if (customExerciseScreen === 'manage') {
                  setCustomExerciseScreen(null);
                  setEditingCustomExercise(null);
                } else if (editingExerciseIndex !== null) {
                  // When editing an existing exercise, back should close the modal
                  closeExerciseModal();
                } else if (currentExercise.name) {
                  // When adding a new exercise, go back to category selection
                  setCurrentExercise({ ...currentExercise, name: '' });
                  setSearchQuery('');
                } else {
                  closeExerciseModal();
                }
              }}
              style={styles.modalBackButton}
            >
              {customExerciseScreen === 'manage' ? (
                <Text style={styles.modalBackText}>← Back</Text>
              ) : editingExerciseIndex !== null ? (
                <X size={24} color={COLORS.text.primary} strokeWidth={2} />
              ) : currentExercise.name ? (
                <Text style={styles.modalBackText}>← Back</Text>
              ) : (
                <X size={24} color={COLORS.text.primary} strokeWidth={2} />
              )}
            </Pressable>
            <Text style={styles.modalTitle}>
              {customExerciseScreen === 'manage'
                ? 'CUSTOM EXERCISES'
                : isCurrentCardioWorkout
                  ? (editingExerciseIndex !== null ? 'EDIT SESSION' : 'ADD SESSION')
                  : (editingExerciseIndex !== null ? 'EDIT EXERCISE' : 'ADD EXERCISE')}
            </Text>
            {customExerciseScreen === 'manage' ? (
              <View style={{ width: 60 }} />
            ) : currentExercise.name ? (
              <Pressable onPress={addExerciseOrSession} style={styles.modalDoneButton}>
                <Text style={styles.modalDoneText}>Done</Text>
              </Pressable>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {customExerciseScreen === 'manage' ? (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.customExerciseForm}>
                <Text style={styles.formTitle}>
                  {editingCustomExercise ? 'Edit Exercise' : 'Create New Exercise'}
                </Text>

                <CustomExerciseForm
                  exercise={editingCustomExercise}
                  onSave={async (name, category) => {
                    const success = await handleSaveCustomExercise(name, category);
                    if (success) {
                      setEditingCustomExercise(null);
                    }
                  }}
                  onCancel={() => setEditingCustomExercise(null)}
                />
              </View>

              {customExercises.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.existingExercisesTitle}>YOUR CUSTOM EXERCISES</Text>

                  {getAllCategories().map(category => {
                    const exercisesInCategory = customExercises.filter(ex => ex.category === category);

                    if (exercisesInCategory.length === 0) return null;

                    return (
                      <View key={category} style={styles.manageCategorySection}>
                        <Text style={styles.manageCategoryTitle}>{category}</Text>
                        {exercisesInCategory.map(exercise => (
                          <View key={exercise.id} style={styles.manageExerciseCard}>
                            <View style={styles.manageExerciseInfo}>
                              <Text style={styles.manageExerciseName}>{exercise.name}</Text>
                              <View style={styles.customBadge}>
                                <Text style={styles.customBadgeText}>CUSTOM</Text>
                              </View>
                            </View>
                            <View style={styles.exerciseCardActions}>
                              <Pressable
                                onPress={() => setEditingCustomExercise(exercise)}
                                style={styles.cardEditButton}
                              >
                                <Text style={styles.cardEditButtonText}>Edit</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteCustomExercise(exercise.id, exercise.name)}
                                style={styles.cardDeleteButton}
                              >
                                <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {currentExercise.name ? (
                <>
                  <Text style={styles.selectedExercise}>{currentExercise.name}</Text>

                  <PreviousSessionBanner
                    previousSession={previousSession}
                    isCardio={isCardioExercise(currentExercise.name)}
                  />

                  <View style={styles.exerciseNotesSection}>
                    <View style={styles.exerciseNotesHeader}>
                      <MessageSquare size={16} color={COLORS.text.tertiary} strokeWidth={2} />
                      <Text style={styles.exerciseNotesLabel}>EXERCISE NOTES</Text>
                    </View>
                    <TextInput
                      style={styles.notesInput}
                      value={currentExercise.notes}
                      onChangeText={(text) => setCurrentExercise({ ...currentExercise, notes: text })}
                      placeholder="Add notes for this exercise..."
                      placeholderTextColor={COLORS.text.tertiary}
                      multiline
                    />
                  </View>

                  <Text style={styles.setsTitle}>SETS</Text>
                  {currentExercise.sets.map((set, index) => (
                    <View
                      key={index}
                      ref={ref => setRefs.current[index] = ref}
                    >
                      <ExerciseSetInput
                        setNumber={index + 1}
                        set={set}
                        isCardio={isCurrentCardioWorkout || isCardioExercise(currentExercise.name)}
                        canRemove={currentExercise.sets.length > 1}
                        onUpdate={(field, value) => updateSetWithCalculation(index, field, value)}
                        onRemove={() => removeSet(index)}
                        onFocus={() => scrollToSet(index)}
                        onConfirm={() => onSetLogged()}
                      />
                    </View>
                  ))}

                  <Pressable onPress={addSet} style={styles.addSetButton}>
                    <Plus size={20} color={COLORS.text.primary} strokeWidth={2.5} />
                    <Text style={styles.addSetButtonText}>Add Set</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.searchSection}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search exercises..."
                      placeholderTextColor={COLORS.text.tertiary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                    />

                    <Pressable
                      onPress={() => {
                        setEditingCustomExercise(null);
                        setCustomExerciseScreen('manage');
                      }}
                      style={styles.manageCustomButton}
                    >
                      <Text style={styles.manageCustomButtonText}>
                        {customExercises.length > 0
                          ? `Manage Custom Exercises (${customExercises.length})`
                          : 'Create Custom Exercise'}
                      </Text>
                    </Pressable>
                  </View>

                  {searchQuery.trim() ? (
                    <View>
                      <Text style={styles.searchResultsTitle}>SEARCH RESULTS</Text>
                      {(() => {
                        const builtInResults = searchBuiltInExercises(searchQuery).map(r => ({
                          ...r,
                          isCustom: false
                        }));
                        const customResults = customExercises
                          .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(ex => ({
                            name: ex.name,
                            category: ex.category,
                            id: ex.id,
                            isCustom: true
                          }));

                        // Combine and sort alphabetically
                        const allResults = [...builtInResults, ...customResults]
                          .sort((a, b) => a.name.localeCompare(b.name));

                        if (allResults.length === 0) {
                          return (
                            <View style={styles.emptySearchResults}>
                              <Text style={styles.emptySearchText}>No exercises found</Text>
                              <Text style={styles.emptySearchSubtext}>
                                Try a different search or create a custom exercise
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <>
                            {allResults.map((result, idx) => (
                              <Pressable
                                key={result.isCustom ? `custom-${result.id}` : `built-in-${idx}`}
                                onPress={async () => {
                                  const prevSession = await findPreviousSession(result.name);
                                  setPreviousSession(prevSession);
                                  setCurrentExercise({ ...currentExercise, name: result.name });
                                  setSearchQuery('');
                                }}
                                style={styles.exerciseOption}
                              >
                                <View style={styles.exerciseOptionRow}>
                                  <Text style={styles.exerciseOptionText}>{result.name}</Text>
                                  {result.isCustom && (
                                    <View style={styles.customBadge}>
                                      <Text style={styles.customBadgeText}>CUSTOM</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.exerciseCategoryTag}>{result.category}</Text>
                              </Pressable>
                            ))}
                          </>
                        );
                      })()}
                    </View>
                  ) : (
                    <>
                      {!selectedMuscleGroup ? (
                        <>
                          <Text style={styles.browseCategoriesTitle}>BROWSE BY CATEGORY</Text>
                          <View style={styles.muscleGrid}>
                            {getAllCategories().map(group => (
                              <Pressable
                                key={group}
                                onPress={() => setSelectedMuscleGroup(group)}
                                style={styles.muscleButton}
                              >
                                <Text style={styles.muscleButtonText}>{group}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      ) : (
                        <View>
                          <Pressable
                            onPress={() => setSelectedMuscleGroup(null)}
                            style={styles.backToCategoriesButton}
                          >
                            <Text style={styles.backToCategoriesText}>← Back to categories</Text>
                          </Pressable>

                          {(() => {
                            // Combine built-in and custom exercises for this category
                            const builtInExercises = EXERCISE_DATABASE[selectedMuscleGroup].map(name => ({
                              name,
                              isCustom: false
                            }));
                            const customInCategory = customExercises
                              .filter(ex => ex.category === selectedMuscleGroup)
                              .map(ex => ({
                                name: ex.name,
                                id: ex.id,
                                isCustom: true
                              }));

                            // Combine and sort alphabetically
                            const allExercises = [...builtInExercises, ...customInCategory]
                              .sort((a, b) => a.name.localeCompare(b.name));

                            return allExercises.map((exercise, idx) => (
                              <Pressable
                                key={exercise.isCustom ? `custom-${exercise.id}` : `built-in-${idx}`}
                                onPress={async () => {
                                  const prevSession = await findPreviousSession(exercise.name);
                                  setPreviousSession(prevSession);
                                  setCurrentExercise({ ...currentExercise, name: exercise.name });
                                  setSelectedMuscleGroup(null);
                                }}
                                style={styles.exerciseOption}
                              >
                                <View style={styles.exerciseOptionRow}>
                                  <Text style={styles.exerciseOptionText}>{exercise.name}</Text>
                                  {exercise.isCustom && (
                                    <View style={styles.customBadge}>
                                      <Text style={styles.customBadgeText}>CUSTOM</Text>
                                    </View>
                                  )}
                                </View>
                              </Pressable>
                            ));
                          })()}
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {/* Rest Timer inside the exercise modal */}
          <RestTimerButton />
        </KeyboardAvoidingView>
      </Modal>

      {/* Rest Timer - always visible in bottom-left corner */}
      <RestTimerButton />

      {/* PR Celebration Modal */}
      <Modal
        visible={showPRCelebration}
        transparent
        animationType="fade"
        onRequestClose={closePRCelebration}
      >
        <View style={styles.prModalOverlay}>
          <View style={styles.prModalContainer}>
            {/* Animated Trophy Icon with Glow */}
            <Animated.View style={[styles.prTrophyContainer, styles.prTrophyGlow, trophyAnimatedStyle, trophyGlowStyle]}>
              <Trophy size={48} color={COLORS.warning} strokeWidth={1.5} fill={COLORS.warning} />
            </Animated.View>

            {/* Animated Title */}
            <Animated.View style={titleAnimatedStyle}>
              <Text style={styles.prModalTitle}>NEW PR{newPRs.length > 1 ? 's' : ''}!</Text>
              <Text style={styles.prModalSubtitle}>
                You crushed {newPRs.length} personal record{newPRs.length > 1 ? 's' : ''}
              </Text>
            </Animated.View>

            {/* Animated PR List */}
            <Animated.View style={[styles.prList, prListAnimatedStyle]}>
              {newPRs.map((pr, index) => (
                <View key={index} style={styles.prListItem}>
                  <View style={styles.prListIcon}>
                    <Award size={16} color={COLORS.accent.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.prListInfo}>
                    <Text style={styles.prListExercise}>{pr.exercise}</Text>
                    <Text style={styles.prListValue}>
                      {pr.weight} lbs × {pr.reps} reps
                    </Text>
                    {pr.previousWeight && (
                      <Text style={styles.prListPrevious}>
                        Previous: {pr.previousWeight} lbs × {pr.previousReps} reps
                      </Text>
                    )}
                  </View>
                  <View style={styles.prListE1RM}>
                    <Text style={styles.prListE1RMLabel}>1RM</Text>
                    <Text style={styles.prListE1RMValue}>{pr.estimatedOneRepMax}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>

            {/* Buttons */}
            <View style={styles.prModalButtons}>
              <Pressable
                style={styles.prModalDismiss}
                onPress={closePRCelebration}
              >
                <Text style={styles.prModalDismissText}>Continue</Text>
              </Pressable>

              <Pressable
                style={styles.prModalViewAll}
                onPress={() => {
                  resetPRCelebration();
                  setShowPRCelebration(false);
                  router.push('/personal-records');
                }}
              >
                <Text style={styles.prModalViewAllText}>View All PRs</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border
  },
  headerButton: {
    padding: SPACING.sm
  },
  headerButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  saveButtonContainer: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.text.tertiary,
    opacity: 0.6,
  },
  saveButtonTextDisabled: {
    color: COLORS.text.secondary,
  },

  // Content
  content: {
    flex: 1,
    padding: SPACING.lg
  },

  // Section
  section: {
    marginBottom: SPACING.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md
  },
  addButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.inverse
  },

  // Draggable List
  draggableList: {
    marginBottom: SPACING.sm,
  },

  // Empty State
  emptyState: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xxxl,
    alignItems: 'center'
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary
  },

  // Exercise Card
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary
  },
  noteIndicator: {
    padding: SPACING.xs
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  editIconButton: {
    padding: SPACING.xs
  },
  deleteIconButton: {
    padding: SPACING.xs
  },
  editText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.accent.primary
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary
  },
  setValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Picker Modal
  pickerModal: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '85%',
    maxHeight: '70%'
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  pickerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center'
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  pickerOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary
  },
  pickerOptionTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '600'
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent.primary,
  },

  // Date Picker Modal
  datePickerModal: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '90%'
  },
  confirmButton: {
    backgroundColor: COLORS.accent.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg
  },
  confirmButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
    textAlign: 'center'
  },

  // Exercise Modal
  exerciseModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border
  },
  modalBackButton: {
    width: 60,
  },
  modalBackText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent.primary,
  },
  modalTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary
  },
  modalDoneButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  modalDoneText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  modalContent: {
    flex: 1
  },
  modalContentContainer: {
    padding: SPACING.lg,
    paddingBottom: 120
  },

  // Selected Exercise
  selectedExercise: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.md
  },

  // Exercise Notes
  exerciseNotesSection: {
    marginBottom: SPACING.xl
  },
  exerciseNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm
  },
  exerciseNotesLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary
  },
  notesInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Sets
  setsTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm
  },
  addSetButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary
  },

  // Search
  searchSection: {
    marginBottom: SPACING.xl
  },
  searchInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.md
  },
  searchResultsTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md
  },
  browseCategoriesTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md
  },
  emptySearchResults: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xxxl,
    alignItems: 'center'
  },
  emptySearchText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm
  },
  emptySearchSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Category Grid
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  muscleButton: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    width: '48%'
  },
  muscleButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    textAlign: 'center'
  },
  backToCategoriesButton: {
    marginBottom: SPACING.lg
  },
  backToCategoriesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent.primary
  },

  // Exercise Options
  exerciseOption: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm
  },
  exerciseOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  exerciseOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary
  },
  exerciseCategoryTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs
  },

  // Custom Exercise
  customBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm
  },
  customBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.accent.primary
  },
  manageCustomButton: {
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center'
  },
  manageCustomButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary
  },

  // Custom Exercise Form
  customExerciseForm: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl
  },
  formTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
    marginVertical: SPACING.xl
  },
  existingExercisesTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg
  },

  // Manage Category
  manageCategorySection: {
    marginBottom: SPACING.xl
  },
  manageCategoryTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md
  },
  manageExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm
  },
  manageExerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  manageExerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary
  },
  exerciseCardActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center'
  },
  cardEditButton: {
    padding: SPACING.xs
  },
  cardEditButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.accent.primary
  },
  cardDeleteButton: {
    padding: SPACING.xs
  },

  // PR Celebration Modal
  prModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    alignItems: 'center',
  },
  prTrophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  prTrophyGlow: {
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 0 },
  },
  prModalTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.warning,
    textAlign: 'center',
  },
  prModalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  prList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  prListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  prListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  prListInfo: {
    flex: 1,
  },
  prListExercise: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  prListValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    marginTop: 2,
  },
  prListPrevious: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  prListE1RM: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  prListE1RMLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
    color: COLORS.accent.primary,
  },
  prListE1RMValue: {
    ...TYPOGRAPHY.statSmall,
    fontSize: 16,
    color: COLORS.accent.primary,
  },
  prModalButtons: {
    width: '100%',
    gap: SPACING.sm,
  },
  prModalDismiss: {
    backgroundColor: COLORS.accent.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  prModalDismissText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
  prModalViewAll: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  prModalViewAllText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },

  // Template Button
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  templateButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
});
