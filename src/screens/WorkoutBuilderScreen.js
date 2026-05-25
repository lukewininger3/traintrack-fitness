import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Award, EllipsisVertical, Timer, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import RestTimerButton from '../components/RestTimer';
import TempoGuide from '../components/TempoGuide';
import { useTimer } from '../contexts/TimerContext';
import CustomExerciseForm from './WorkoutBuilder/components/CustomExerciseForm';
import ExerciseCard from './WorkoutBuilder/components/ExerciseCard';
import { useWorkoutForm } from './WorkoutBuilder/hooks/useWorkoutForm';
import Confetti from '../components/Confetti';

export default function WorkoutBuilderScreen() {
  const { colors: themeColors } = useTheme();
  const { sendPRCelebration } = useNotifications();
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const templateId = params?.templateId;
  const repeatData = params?.repeatData;
  const workoutDetails = params?.workoutDetails;

  // Use the workout form hook for state management
  const {
    workout,
    isEditing,
    isSaving,
    isCardioWorkoutType,
    isCardioExercise,
    setWorkout,
    saveWorkoutData,
    findPreviousSession,
    discardWorkout,
    flushSave,
  } = useWorkoutForm({ editingWorkoutId, templateId, repeatData, workoutDetails });

  // Track previous sessions for each exercise
  const [previousSessions, setPreviousSessions] = useState({});

  // Timer for auto-start after logging sets
  const { reset: resetTimer, onSetLogged } = useTimer();

  // Load previous sessions when exercises change
  useEffect(() => {
    const loadPreviousSessions = async () => {
      const sessions = {};
      for (const exercise of workout.exercises) {
        if (!isMountedRef.current) return; // Check mounted before each async call
        if (!previousSessions[exercise.name]) {
          const prevSession = await findPreviousSession(exercise.name);
          if (prevSession) {
            sessions[exercise.name] = prevSession;
          }
        }
      }
      if (isMountedRef.current && Object.keys(sessions).length > 0) {
        setPreviousSessions(prev => ({ ...prev, ...sessions }));
      }
    };
    loadPreviousSessions();
  }, [workout.exercises.map(e => e.name).join(',')]);

  // Handle set confirmation - start rest timer, haptic feedback, and save immediately
  const handleSetConfirmed = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSetLogged();
    // Immediately save to prevent data loss on crash
    flushSave();
  };

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [showTempoGuide, setShowTempoGuide] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [editingCustomExercise, setEditingCustomExercise] = useState(null);
  const [customExerciseScreen, setCustomExerciseScreen] = useState(null);

  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef(null);

  // Track mounted state to guard async callbacks
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Scroll to a specific position (used when notes are focused)
  const scrollToPosition = (y) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  // Scroll to the end (used when new exercise is added)
  const scrollToEnd = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

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
      if (isMountedRef.current) navigateToActivities();
    }, 100);
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
    if (!isMountedRef.current) return false;
    if (exists && (!editingCustomExercise || editingCustomExercise.name !== name)) {
      Alert.alert('Duplicate Exercise', `This exercise already exists as a ${type} exercise`);
      return false;
    }

    const { error } = await saveCustomExercise(name.trim(), category, editingCustomExercise?.id);
    if (!isMountedRef.current) return false;

    if (error) {
      Alert.alert('Error', error);
      return false;
    }

    await loadCustomExercisesData();
    if (!isMountedRef.current) return true;
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
            if (!isMountedRef.current) return;

            if (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            } else {
              await loadCustomExercisesData();
              if (isMountedRef.current) Alert.alert('Success', 'Exercise deleted!');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadCustomExercisesData();
  }, []);

  const loadCustomExercisesData = async () => {
    const customs = await loadCustomExercises();
    if (isMountedRef.current) setCustomExercises(customs);
  };

  const saveWorkout = async () => {
    try {
      const result = await saveWorkoutData();

      if (!isMountedRef.current || !result.success) {
        return;
      }

      if (result.achievedPRs && result.achievedPRs.length > 0) {
        // Show celebration modal
        setNewPRs(result.achievedPRs);
        setShowPRCelebration(true);
        // Send push notification for the first PR (most significant)
        const firstPR = result.achievedPRs[0];
        sendPRCelebration(firstPR.exercise, firstPR.weight, firstPR.reps);
        // Trigger animation after modal renders
        setTimeout(() => {
          if (isMountedRef.current) triggerPRCelebration();
        }, 100);
      } else {
        navigateToActivities();
      }
    } catch (error) {
      console.error('Error in saveWorkout:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Something went wrong while saving. Please try again.');
      }
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
      if (isMountedRef.current) {
        setSearchQuery('');
        setSelectedMuscleGroup(null);
      }
    }, 200);
  };

  const addExerciseToWorkout = (exerciseName) => {
    const isCurrentCardioWorkout = isCardioWorkoutType(workout.type);
    const isExerciseCardio = isCardioExercise(exerciseName);
    const isCardioEntry = isCurrentCardioWorkout || isExerciseCardio;

    const exercise = {
      name: exerciseName,
      sets: isCardioEntry
        ? [{ distance: 0, time: 0, pace: 0 }]
        : [{ weight: 0, reps: 0 }],
      notes: ''
    };

    setWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
    closeExerciseModal();
    scrollToEnd();
  };

  const addCardioSession = () => {
    const sessionName = `Session ${workout.exercises.length + 1}`;
    const exercise = {
      name: sessionName,
      sets: [{ distance: 0, time: 0, pace: 0 }],
      notes: ''
    };
    setWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
    closeExerciseModal();
    scrollToEnd();
  };

  const moveExercise = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= workout.exercises.length) return;
    const updated = [...workout.exercises];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setWorkout({ ...workout, exercises: updated });
  };

  const isCurrentCardioWorkout = isCardioWorkoutType(workout.type);

  const sectionLabel = isCurrentCardioWorkout ? 'Sessions' : 'Exercises';
  const addButtonLabel = isCurrentCardioWorkout ? 'Add Session' : 'Add Exercise';
  const emptyStateText = isCurrentCardioWorkout ? 'No sessions yet' : 'No exercises yet';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <View style={[styles.header, { backgroundColor: themeColors.background.primary, borderBottomColor: themeColors.surface.border }]}>
        <Pressable
          onPress={() => {
            if (isEditing) {
              // Editing existing workout - only changes will be lost
              Alert.alert(
                'Discard Changes?',
                'Your changes will not be saved. The original workout will remain unchanged.',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                      resetTimer();
                      await discardWorkout();
                      router.replace('/activities');
                    },
                  },
                ]
              );
            } else {
              // New workout - entire workout will be discarded
              Alert.alert(
                'Discard Workout?',
                'This workout will not be saved.',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                      resetTimer();
                      await discardWorkout();
                      router.replace('/activities');
                    },
                  },
                ]
              );
            }
          }}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color={themeColors.text.secondary} strokeWidth={2} />
        </Pressable>
        <Pressable
          style={[styles.typeButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
          onPress={navigateToEditDetails}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.typeButtonText, { color: themeColors.text.primary }]}>{workout.type}</Text>
          <Pencil size={12} color={themeColors.text.secondary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            onPress={saveWorkout}
            style={[styles.saveButtonContainer, { backgroundColor: themeColors.accent.primary }, isSaving && { opacity: 0.5 }]}
            disabled={isSaving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.saveButtonText, { color: themeColors.text.inverse }]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Options',
                null,
                [
                  { text: 'Save as Template', onPress: handleSaveAsTemplate },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            style={styles.moreButton}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          >
            <EllipsisVertical size={18} color={themeColors.text.secondary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.tertiary }]}>{sectionLabel.toUpperCase()}</Text>
          {!isCurrentCardioWorkout && (
            <Pressable
              onPress={() => setShowTempoGuide(!showTempoGuide)}
              style={[styles.tempoToggleButton, { backgroundColor: themeColors.surface.card }, showTempoGuide && { backgroundColor: themeColors.accent.primary }]}
              hitSlop={8}
            >
              <Timer size={16} color={showTempoGuide ? themeColors.text.inverse : themeColors.text.secondary} strokeWidth={2} />
              <Text style={[styles.tempoToggleText, { color: themeColors.text.secondary }, showTempoGuide && { color: themeColors.text.inverse }]}>Tempo</Text>
            </Pressable>
          )}
        </View>

        {/* Tempo Guide */}
        <TempoGuide
          visible={showTempoGuide}
          onClose={() => setShowTempoGuide(false)}
        />

        {workout.exercises.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>{emptyStateText}</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>Tap the button below to get started</Text>
          </View>
        ) : (
          workout.exercises.map((exercise, index) => (
            <ExerciseCard
              key={`exercise-${index}-${exercise.name}`}
              exercise={exercise}
              index={index}
              isCardioWorkout={isCurrentCardioWorkout}
              previousSession={previousSessions[exercise.name]}
              onSetConfirmed={handleSetConfirmed}
              onUpdateSets={(idx, updatedSets) => {
                const updated = [...workout.exercises];
                updated[idx] = { ...updated[idx], sets: updatedSets };
                setWorkout({ ...workout, exercises: updated });
              }}
              onUpdateNotes={(idx, notes) => {
                const updated = [...workout.exercises];
                updated[idx] = { ...updated[idx], notes };
                setWorkout({ ...workout, exercises: updated });
              }}
              onUpdateMedia={(idx, media) => {
                const updated = [...workout.exercises];
                updated[idx] = { ...updated[idx], media };
                setWorkout({ ...workout, exercises: updated });
              }}
              onDelete={(idx) => {
                const updated = workout.exercises.filter((_, i) => i !== idx);
                setWorkout({ ...workout, exercises: updated });
              }}
              onNotesFocus={(yPosition) => scrollToPosition(yPosition)}
              totalExercises={workout.exercises.length}
              allExercises={workout.exercises}
              onUpdateSuperset={(idx, supersetId) => {
                const updated = [...workout.exercises];
                updated[idx] = { ...updated[idx], supersetId };
                setWorkout({ ...workout, exercises: updated });
              }}
              onMoveUp={(idx) => moveExercise(idx, idx - 1)}
              onMoveDown={(idx) => moveExercise(idx, idx + 1)}
            />
          ))
        )}

        {/* Spacer for sticky button */}
        {workout.exercises.length > 0 && <View style={{ height: SPACING.lg }} />}
      </ScrollView>

      {/* Sticky Add Exercise Button */}
      <View style={[styles.stickyAddButtonContainer, { backgroundColor: themeColors.background.primary, borderTopColor: themeColors.surface.border }]}>
        <Pressable
          onPress={() => {
            if (isCurrentCardioWorkout) {
              addCardioSession();
            } else {
              setShowExercisePicker(true);
            }
          }}
          style={[styles.stickyAddButton, { backgroundColor: themeColors.accent.primary }]}
        >
          <Plus size={20} color={themeColors.text.inverse} strokeWidth={2.5} />
          <Text style={[styles.stickyAddButtonText, { color: themeColors.text.inverse }]}>{addButtonLabel}</Text>
        </Pressable>
      </View>

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
        <SafeAreaView style={[styles.exerciseModalContainer, { backgroundColor: themeColors.background.primary }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
          <View style={[styles.modalHeader, { backgroundColor: themeColors.background.primary, borderBottomColor: themeColors.surface.border }]}>
            <Pressable
              onPress={() => {
                if (customExerciseScreen === 'manage') {
                  setCustomExerciseScreen(null);
                  setEditingCustomExercise(null);
                } else {
                  closeExerciseModal();
                }
              }}
              style={styles.modalBackButton}
            >
              {customExerciseScreen === 'manage' ? (
                <Text style={[styles.modalBackText, { color: themeColors.accent.primary }]}>← Back</Text>
              ) : (
                <X size={24} color={themeColors.text.primary} strokeWidth={2} />
              )}
            </Pressable>
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
              {customExerciseScreen === 'manage' ? 'CUSTOM EXERCISES' : 'ADD EXERCISE'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {customExerciseScreen === 'manage' ? (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.customExerciseForm, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                <Text style={[styles.formTitle, { color: themeColors.text.primary }]}>
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
                  <View style={[styles.divider, { backgroundColor: themeColors.surface.border }]} />
                  <Text style={[styles.existingExercisesTitle, { color: themeColors.text.secondary }]}>YOUR CUSTOM EXERCISES</Text>

                  {getAllCategories().map(category => {
                    const exercisesInCategory = customExercises.filter(ex => ex.category === category);

                    if (exercisesInCategory.length === 0) return null;

                    return (
                      <View key={category} style={styles.manageCategorySection}>
                        <Text style={[styles.manageCategoryTitle, { color: themeColors.text.primary }]}>{category}</Text>
                        {exercisesInCategory.map(exercise => (
                          <View key={exercise.id} style={[styles.manageExerciseCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                            <Text style={[styles.manageExerciseName, { color: themeColors.text.primary }]} numberOfLines={1}>{exercise.name}</Text>
                            <View style={styles.exerciseCardActions}>
                              <Pressable
                                onPress={() => setEditingCustomExercise(exercise)}
                                style={styles.cardEditButton}
                              >
                                <Text style={[styles.cardEditButtonText, { color: themeColors.accent.primary }]}>Edit</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteCustomExercise(exercise.id, exercise.name)}
                                style={styles.cardDeleteButton}
                              >
                                <Trash2 size={18} color={themeColors.error} strokeWidth={2} />
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
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.searchSection}>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: themeColors.surface.card, color: themeColors.text.primary, borderColor: themeColors.surface.border }]}
                  placeholder="Search exercises..."
                  placeholderTextColor={themeColors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />

                <Pressable
                  onPress={() => {
                    setEditingCustomExercise(null);
                    setCustomExerciseScreen('manage');
                  }}
                  style={[styles.manageCustomButton, { borderColor: themeColors.accent.primary }]}
                >
                  <Text style={[styles.manageCustomButtonText, { color: themeColors.accent.primary }]}>
                    {customExercises.length > 0
                      ? `Manage Custom Exercises (${customExercises.length})`
                      : 'Create Custom Exercise'}
                  </Text>
                </Pressable>
              </View>

              {searchQuery.trim() ? (
                <View>
                  <Text style={[styles.searchResultsTitle, { color: themeColors.text.secondary }]}>SEARCH RESULTS</Text>
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
                        <View style={[styles.emptySearchResults, { backgroundColor: themeColors.surface.card }]}>
                          <Text style={[styles.emptySearchText, { color: themeColors.text.secondary }]}>No exercises found</Text>
                          <Text style={[styles.emptySearchSubtext, { color: themeColors.text.tertiary }]}>
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
                            onPress={() => addExerciseToWorkout(result.name)}
                            style={[styles.exerciseOption, { borderBottomColor: themeColors.surface.border }]}
                          >
                            <View style={styles.exerciseOptionRow}>
                              <Text style={[styles.exerciseOptionText, { color: themeColors.text.primary }]}>{result.name}</Text>
                              {result.isCustom && (
                                <View style={[styles.customBadge, { backgroundColor: themeColors.accent.primaryDim }]}>
                                  <Text style={[styles.customBadgeText, { color: themeColors.accent.primary }]}>CUSTOM</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.exerciseCategoryTag, { color: themeColors.text.tertiary }]}>{result.category}</Text>
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
                          <Text style={[styles.browseCategoriesTitle, { color: themeColors.text.secondary }]}>BROWSE BY CATEGORY</Text>
                          <View style={styles.muscleGrid}>
                            {getAllCategories().map(group => (
                              <Pressable
                                key={group}
                                onPress={() => setSelectedMuscleGroup(group)}
                                style={[styles.muscleButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                              >
                                <Text style={[styles.muscleButtonText, { color: themeColors.text.primary }]}>{group}</Text>
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
                            <Text style={[styles.backToCategoriesText, { color: themeColors.accent.primary }]}>← Back to categories</Text>
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
                                onPress={() => addExerciseToWorkout(exercise.name)}
                                style={[styles.exerciseOption, { borderBottomColor: themeColors.surface.border }]}
                              >
                                <View style={styles.exerciseOptionRow}>
                                  <Text style={[styles.exerciseOptionText, { color: themeColors.text.primary }]}>{exercise.name}</Text>
                                  {exercise.isCustom && (
                                    <View style={[styles.customBadge, { backgroundColor: themeColors.accent.primaryDim }]}>
                                      <Text style={[styles.customBadgeText, { color: themeColors.accent.primary }]}>CUSTOM</Text>
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
            </ScrollView>
          )}

          {/* Rest Timer inside the exercise modal */}
          <RestTimerButton />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Rest Timer - always visible in bottom-left corner */}
      <RestTimerButton />

      {/* Confetti overlay */}
      <Confetti trigger={showPRCelebration} />

      {/* PR Celebration Modal */}
      <Modal
        visible={showPRCelebration}
        transparent
        animationType="fade"
        onRequestClose={closePRCelebration}
      >
        <Pressable style={styles.prModalOverlay} onPress={closePRCelebration}>
          <Pressable style={[styles.prModalContainer, { backgroundColor: themeColors.surface.card }]}>
            {/* Animated Trophy Icon with Glow */}
            <Animated.View style={[styles.prTrophyContainer, { backgroundColor: themeColors.warningDim }, trophyAnimatedStyle, trophyGlowStyle]}>
              <Trophy size={48} color={themeColors.warning} strokeWidth={1.5} fill={themeColors.warning} />
            </Animated.View>

            {/* Animated Title */}
            <Animated.View style={titleAnimatedStyle}>
              <Text style={[styles.prModalTitle, { color: themeColors.text.primary }]}>NEW PR{newPRs.length > 1 ? 's' : ''}!</Text>
              <Text style={[styles.prModalSubtitle, { color: themeColors.text.secondary }]}>
                You crushed {newPRs.length} personal record{newPRs.length > 1 ? 's' : ''}
              </Text>
            </Animated.View>

            {/* Animated PR List */}
            <Animated.View style={[styles.prList, prListAnimatedStyle]}>
              {newPRs.map((pr, index) => (
                <View key={index} style={[styles.prListItem, { backgroundColor: themeColors.background.elevated }]}>
                  <View style={[styles.prListIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
                    <Award size={16} color={themeColors.accent.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.prListInfo}>
                    <Text style={[styles.prListExercise, { color: themeColors.text.primary }]}>{pr.exercise}</Text>
                    <Text style={[styles.prListValue, { color: themeColors.text.secondary }]}>
                      {pr.weight} lbs × {pr.reps} reps
                    </Text>
                    {pr.previousWeight && (
                      <Text style={[styles.prListPrevious, { color: themeColors.text.tertiary }]}>
                        Previous: {pr.previousWeight} lbs × {pr.previousReps} reps
                      </Text>
                    )}
                  </View>
                  <View style={[styles.prListE1RM, { backgroundColor: themeColors.warning + '20' }]}>
                    <Text style={[styles.prListE1RMLabel, { color: themeColors.warning }]}>1RM</Text>
                    <Text style={[styles.prListE1RMValue, { color: themeColors.warning }]}>{pr.estimatedOneRepMax}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>

            {/* Buttons */}
            <View style={styles.prModalButtons}>
              <Pressable
                style={[styles.prModalDismiss, { backgroundColor: themeColors.accent.primary }]}
                onPress={closePRCelebration}
              >
                <Text style={[styles.prModalDismissText, { color: themeColors.text.inverse }]}>Continue</Text>
              </Pressable>

              <Pressable
                style={[styles.prModalViewAll, { borderColor: themeColors.surface.border }]}
                onPress={() => {
                  resetPRCelebration();
                  setShowPRCelebration(false);
                  router.push('/personal-records');
                }}
              >
                <Text style={[styles.prModalViewAllText, { color: themeColors.text.primary }]}>View All PRs</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerSpacer: {
    width: 60,
  },
  closeButton: {
    width: 60,
    paddingVertical: SPACING.xs,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  typeButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  saveButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },

  // Content
  content: {
    flex: 1,
    padding: SPACING.lg,
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
  },

  scrollContentContainer: {
    paddingBottom: SPACING.xl * 4,
  },

  // Sticky Add Button
  stickyAddButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  stickyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  stickyAddButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },

  // Empty State
  emptyState: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Picker Modal
  pickerModal: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '85%',
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  pickerTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },

  // Exercise Modal
  exerciseModalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  modalBackButton: {
    width: 60,
  },
  modalBackText: {
    ...TYPOGRAPHY.body,
  },
  modalTitle: {
    ...TYPOGRAPHY.label,
  },
  modalDoneButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  modalDoneText: {
    ...TYPOGRAPHY.bodyBold,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },

  // Search
  searchSection: {
    marginBottom: SPACING.xl,
  },
  searchInput: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  searchResultsTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.md,
  },
  browseCategoriesTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.md,
  },
  emptySearchResults: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptySearchText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
  },
  emptySearchSubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },

  // Category Grid
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  muscleButton: {
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    width: '48%',
  },
  muscleButtonText: {
    ...TYPOGRAPHY.bodyBold,
    textAlign: 'center',
  },
  backToCategoriesButton: {
    marginBottom: SPACING.lg,
  },
  backToCategoriesText: {
    ...TYPOGRAPHY.body,
  },

  // Exercise Options
  exerciseOption: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  exerciseOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseOptionText: {
    ...TYPOGRAPHY.body,
  },
  exerciseCategoryTag: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },

  // Custom Exercise
  customBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  customBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manageCustomButton: {
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  manageCustomButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },

  // Custom Exercise Form
  customExerciseForm: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  formTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.lg,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.xl,
  },
  existingExercisesTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.lg,
  },

  // Manage Category
  manageCategorySection: {
    marginBottom: SPACING.xl,
  },
  manageCategoryTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  manageExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  manageExerciseName: {
    ...TYPOGRAPHY.body,
    flex: 1,
    marginRight: SPACING.md,
  },
  exerciseCardActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  cardEditButton: {
    padding: SPACING.xs,
  },
  cardEditButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  cardDeleteButton: {
    padding: SPACING.xs,
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
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  prTrophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  prModalTitle: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
  },
  prModalSubtitle: {
    ...TYPOGRAPHY.body,
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
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  prListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  prListInfo: {
    flex: 1,
  },
  prListExercise: {
    ...TYPOGRAPHY.bodyBold,
  },
  prListValue: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  prListPrevious: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  prListE1RM: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  prListE1RMLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
  },
  prListE1RMValue: {
    ...TYPOGRAPHY.statSmall,
    fontSize: 16,
  },
  prModalButtons: {
    width: '100%',
    gap: SPACING.sm,
  },
  prModalDismiss: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  prModalDismissText: {
    ...TYPOGRAPHY.bodyBold,
  },
  prModalViewAll: {
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  prModalViewAllText: {
    ...TYPOGRAPHY.bodyBold,
  },

  // Tempo Guide Toggle
  tempoToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  tempoToggleText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
});
