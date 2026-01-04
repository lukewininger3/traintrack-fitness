import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Award, FileText, MessageSquare, Plus, Trash2, Trophy, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { EXERCISE_DATABASE, WORKOUT_TYPES, getAllCategories, searchBuiltInExercises } from '../constants/workoutTypes';
import { exerciseExists, loadCustomExercises, saveCustomExercise } from '../utils/customExercises';
import { checkAndUpdatePRs } from '../utils/personalRecords';
import { getTodayString, loadWorkouts, saveWorkouts } from '../utils/storage';
import { loadTemplates, saveAsTemplate } from '../utils/workoutTemplates';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import RestTimerButton from '../components/RestTimer';
import CustomExerciseForm from './WorkoutBuilder/components/CustomExerciseForm';
import ExerciseSetInput from './WorkoutBuilder/components/ExerciseSetInput';
import PreviousSessionBanner from './WorkoutBuilder/components/PreviousSessionBanner';
import WorkoutFormFields from './WorkoutBuilder/components/WorkoutFormFields';

export default function WorkoutBuilderScreen() {
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const templateId = params?.templateId;
  const isEditing = !!editingWorkoutId;
  const isFromTemplate = !!templateId;
  const scrollViewRef = useRef(null);
  const setRefs = useRef([]);

  const [workout, setWorkout] = useState({
    name: '',
    type: 'Strength',
    date: getTodayString(),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    notes: '',
    exercises: []
  });

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  const [currentExercise, setCurrentExercise] = useState({
    name: '',
    sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }],
    notes: ''
  });

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [previousSession, setPreviousSession] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [editingCustomExercise, setEditingCustomExercise] = useState(null);
  const [customExerciseScreen, setCustomExerciseScreen] = useState(null);

  // PR Celebration state
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [newPRs, setNewPRs] = useState([]);

  const navigateBack = () => {
    // Always return to activities after saving or closing
    router.replace('/activities');
  };

  const findPreviousSession = async (exerciseName) => {
    const allWorkouts = await loadWorkouts();
    const sorted = allWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const w of sorted) {
      if (isEditing && w.id === parseInt(editingWorkoutId)) continue;
      const exercise = w.exercises?.find(e => e.name === exerciseName);
      if (exercise) {
        return {
          date: w.date,
          sets: exercise.sets,
          workoutName: w.name
        };
      }
    }
    return null;
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
    if (isEditing) {
      loadEditingWorkout();
    } else if (isFromTemplate) {
      loadFromTemplate();
    } else {
      const now = new Date();
      setWorkout({
        name: '',
        type: 'Strength',
        date: getTodayString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: '',
        exercises: []
      });
    }
  }, [editingWorkoutId, templateId]);

  const loadFromTemplate = async () => {
    const templates = await loadTemplates();
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      const now = new Date();
      setWorkout({
        name: template.name,
        type: template.type,
        date: getTodayString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: '',
        exercises: template.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(set => ({
            weight: set.weight || 0,
            reps: set.reps || 0,
            distance: set.distance || 0,
            time: set.time || 0,
            pace: set.pace || 0
          })),
          notes: ex.notes || ''
        }))
      });
    }
  };

  useEffect(() => {
    loadCustomExercisesData();
  }, []);

  const loadCustomExercisesData = async () => {
    const customs = await loadCustomExercises();
    setCustomExercises(customs);
  };

  const loadEditingWorkout = async () => {
    const workouts = await loadWorkouts();
    const workoutToEdit = workouts.find(w => w.id === parseInt(editingWorkoutId));
    if (workoutToEdit) {
      setWorkout({
        ...workoutToEdit,
        time: workoutToEdit.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: workoutToEdit.notes || ''
      });
    }
  };

  const isCardioWorkoutType = (type) => {
    return type === 'Running' || type === 'Cycling' || type === 'Swimming';
  };

  const isCardioExercise = (exerciseName) => {
    return EXERCISE_DATABASE.Cardio?.includes(exerciseName);
  };

  const handleTypeChange = (newType) => {
    const oldIsCardio = isCardioWorkoutType(workout.type);
    const newIsCardio = isCardioWorkoutType(newType);

    if (workout.exercises.length > 0 && oldIsCardio !== newIsCardio) {
      Alert.alert(
        'Warning: Data Will Be Lost',
        `Changing from ${oldIsCardio ? 'cardio' : 'strength'} to ${newIsCardio ? 'cardio' : 'strength'} will delete all ${oldIsCardio ? 'sessions' : 'exercises'} you've added. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              setWorkout({
                ...workout,
                type: newType,
                exercises: []
              });
              setShowTypePicker(false);
            }
          }
        ]
      );
    } else {
      setWorkout({
        ...workout,
        type: newType,
      });
      setShowTypePicker(false);
    }
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
    if (!workout.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return;
    }

    if (workout.exercises.length === 0) {
      const label = isCardioWorkoutType(workout.type) ? 'sessions' : 'exercises';
      Alert.alert('No ' + label.charAt(0).toUpperCase() + label.slice(1), `Please add at least one ${label.slice(0, -1)}`);
      return;
    }

    const workouts = await loadWorkouts();

    const workoutToSave = {
      ...workout,
      type: workout.type
    };

    let savedWorkout;

    if (isEditing) {
      savedWorkout = { ...workoutToSave, id: parseInt(editingWorkoutId) };
      const updated = workouts.map(w =>
        w.id === parseInt(editingWorkoutId) ? { ...w, ...workoutToSave } : w
      );
      await saveWorkouts(updated);
    } else {
      savedWorkout = {
        ...workoutToSave,
        id: Date.now()
      };
      await saveWorkouts([...workouts, savedWorkout]);
    }

    // Check for new PRs (only for strength workouts)
    const achievedPRs = await checkAndUpdatePRs(savedWorkout);

    if (achievedPRs.length > 0) {
      // Show celebration modal
      setNewPRs(achievedPRs);
      setShowPRCelebration(true);
    } else {
      navigateBack();
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

    closeExerciseModal();
  };

  const deleteExercise = (index) => {
    const label = isCardioWorkoutType(workout.type) ? 'Session' : 'Exercise';
    Alert.alert(
      `Delete ${label}`,
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = workout.exercises.filter((_, i) => i !== index);
            setWorkout({ ...workout, exercises: updated });
          }
        }
      ]
    );
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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        const dateString = selectedDate.toISOString().split('T')[0];
        setWorkout({ ...workout, date: dateString });
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTempTime(selectedTime);
      if (Platform.OS === 'android') {
        const timeString = selectedTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setWorkout({ ...workout, time: timeString });
      }
    }
  };

  const confirmDate = () => {
    const dateString = tempDate.toISOString().split('T')[0];
    setWorkout({ ...workout, date: dateString });
    setShowDatePicker(false);
  };

  const confirmTime = () => {
    const timeString = tempTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    setWorkout({ ...workout, time: timeString });
    setShowTimePicker(false);
  };

  const isCurrentCardioWorkout = isCardioWorkoutType(workout.type);
  const displayType = workout.type;

  const formatSetDisplay = (set) => {
    if (set.distance > 0 || set.time > 0 || set.pace > 0) {
      const parts = [];
      if (set.distance > 0) parts.push(`${set.distance} mi`);
      if (set.time > 0) parts.push(`${set.time} min`);
      if (set.pace > 0) parts.push(`${set.pace} min/mi`);
      return parts.join(' • ');
    } else {
      return `${set.weight} lbs × ${set.reps} reps`;
    }
  };

  const sectionLabel = isCurrentCardioWorkout ? 'Sessions' : 'Exercises';
  const addButtonLabel = isCurrentCardioWorkout ? 'Add Session' : 'Add Exercise';
  const emptyStateText = isCurrentCardioWorkout ? 'No sessions yet' : 'No exercises yet';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/activities')} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'EDIT WORKOUT' : 'NEW WORKOUT'}</Text>
        <Pressable onPress={saveWorkout} style={styles.saveButtonContainer}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <WorkoutFormFields
          workout={workout}
          onWorkoutChange={setWorkout}
          onShowTypePicker={() => setShowTypePicker(true)}
          onShowDatePicker={() => {
            const [year, month, day] = workout.date.split('-');
            setTempDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            setShowDatePicker(true);
          }}
          onShowTimePicker={() => setShowTimePicker(true)}
          displayType={displayType}
        />

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
            workout.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.notes && (
                      <Pressable
                        onPress={() => Alert.alert('Notes', exercise.notes)}
                        style={styles.noteIndicator}
                      >
                        <MessageSquare size={16} color={COLORS.tertiary.primary} fill={COLORS.tertiary.primary} strokeWidth={2} />
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.exerciseActions}>
                    <Pressable
                      onPress={async () => {
                        setEditingExerciseIndex(index);

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
                      style={styles.editIconButton}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteExercise(index)} style={styles.deleteIconButton}>
                      <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
                {exercise.sets.map((set, setIdx) => (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={styles.setLabel}>SET {setIdx + 1}</Text>
                    <Text style={styles.setValue}>{formatSetDisplay(set)}</Text>
                  </View>
                ))}
              </View>
            ))
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

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent={true} animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>SELECT TYPE</Text>
            {WORKOUT_TYPES.map(type => (
              <Pressable
                key={type}
                style={[styles.pickerOption, workout.type === type && styles.pickerOptionSelected]}
                onPress={() => handleTypeChange(type)}
              >
                <Text style={[styles.pickerOptionText, workout.type === type && styles.pickerOptionTextSelected]}>
                  {type}
                </Text>
                {workout.type === type && <View style={styles.selectedDot} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent={true} animationType="fade" visible={showDatePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <View style={styles.datePickerModal}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>SELECT DATE</Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                textColor={COLORS.text.primary}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.confirmButton} onPress={confirmDate}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Modal transparent={true} animationType="fade" visible={showTimePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
            <View style={styles.datePickerModal}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>SELECT TIME</Text>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                textColor={COLORS.text.primary}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.confirmButton} onPress={confirmTime}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}

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
        <View style={styles.exerciseModalContainer}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                if (customExerciseScreen === 'manage') {
                  setCustomExerciseScreen(null);
                  setEditingCustomExercise(null);
                } else if (currentExercise.name) {
                  setCurrentExercise({ ...currentExercise, name: '' });
                  setSearchQuery('');
                } else {
                  closeExerciseModal();
                }
              }}
              style={styles.modalBackButton}
            >
              {customExerciseScreen === 'manage' || currentExercise.name ? (
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
                        const builtInResults = searchBuiltInExercises(searchQuery);
                        const customResults = customExercises.filter(ex =>
                          ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (builtInResults.length === 0 && customResults.length === 0) {
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
                            {builtInResults.map((result, idx) => (
                              <Pressable
                                key={`built-in-${idx}`}
                                onPress={async () => {
                                  const prevSession = await findPreviousSession(result.name);
                                  setPreviousSession(prevSession);
                                  setCurrentExercise({ ...currentExercise, name: result.name });
                                  setSearchQuery('');
                                }}
                                style={styles.exerciseOption}
                              >
                                <Text style={styles.exerciseOptionText}>{result.name}</Text>
                                <Text style={styles.exerciseCategoryTag}>{result.category}</Text>
                              </Pressable>
                            ))}
                            {customResults.map((exercise) => (
                              <Pressable
                                key={`custom-${exercise.id}`}
                                onPress={async () => {
                                  const prevSession = await findPreviousSession(exercise.name);
                                  setPreviousSession(prevSession);
                                  setCurrentExercise({ ...currentExercise, name: exercise.name });
                                  setSearchQuery('');
                                }}
                                style={styles.exerciseOption}
                              >
                                <View style={styles.exerciseOptionRow}>
                                  <Text style={styles.exerciseOptionText}>{exercise.name}</Text>
                                  <View style={styles.customBadge}>
                                    <Text style={styles.customBadgeText}>CUSTOM</Text>
                                  </View>
                                </View>
                                <Text style={styles.exerciseCategoryTag}>{exercise.category}</Text>
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

                          <>
                            {EXERCISE_DATABASE[selectedMuscleGroup].map(exercise => (
                              <Pressable
                                key={exercise}
                                onPress={async () => {
                                  const prevSession = await findPreviousSession(exercise);
                                  setPreviousSession(prevSession);
                                  setCurrentExercise({ ...currentExercise, name: exercise });
                                  setSelectedMuscleGroup(null);
                                }}
                                style={styles.exerciseOption}
                              >
                                <Text style={styles.exerciseOptionText}>{exercise}</Text>
                              </Pressable>
                            ))}

                            {customExercises
                              .filter(ex => ex.category === selectedMuscleGroup)
                              .map(exercise => (
                                <Pressable
                                  key={`custom-${exercise.id}`}
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
                                    <View style={styles.customBadge}>
                                      <Text style={styles.customBadgeText}>CUSTOM</Text>
                                    </View>
                                  </View>
                                </Pressable>
                              ))}
                          </>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {/* Rest Timer inside the modal */}
          <RestTimerButton />
        </View>
      </Modal>

      {/* Rest Timer - always visible in bottom-left corner */}
      <RestTimerButton />

      {/* PR Celebration Modal */}
      <Modal
        visible={showPRCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPRCelebration(false);
          navigateBack();
        }}
      >
        <View style={styles.prModalOverlay}>
          <View style={styles.prModalContainer}>
            {/* Trophy Icon */}
            <View style={styles.prTrophyContainer}>
              <Trophy size={48} color={COLORS.warning} strokeWidth={1.5} fill={COLORS.warning} />
            </View>

            {/* Title */}
            <Text style={styles.prModalTitle}>NEW PR{newPRs.length > 1 ? 's' : ''}!</Text>
            <Text style={styles.prModalSubtitle}>
              You crushed {newPRs.length} personal record{newPRs.length > 1 ? 's' : ''}
            </Text>

            {/* PR List */}
            <View style={styles.prList}>
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
            </View>

            {/* Buttons */}
            <View style={styles.prModalButtons}>
              <Pressable
                style={styles.prModalDismiss}
                onPress={() => {
                  setShowPRCelebration(false);
                  navigateBack();
                }}
              >
                <Text style={styles.prModalDismissText}>Continue</Text>
              </Pressable>

              <Pressable
                style={styles.prModalViewAll}
                onPress={() => {
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
    </View>
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
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary
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
