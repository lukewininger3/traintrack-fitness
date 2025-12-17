import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal
} from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import { loadWorkouts, saveWorkouts, getTodayString } from '../utils/storage';
import { WORKOUT_TYPES, EXERCISE_DATABASE } from '../constants/workoutTypes';
import { router, useLocalSearchParams } from 'expo-router';

export default function WorkoutBuilderScreen() {
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const isEditing = !!editingWorkoutId;

  const [workout, setWorkout] = useState({
    name: '',
    type: 'Strength',
    date: getTodayString(),
    exercises: []
  });

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  const [currentExercise, setCurrentExercise] = useState({
    name: '',
    sets: [{ weight: '', reps: '', distance: '', time: '' }]
  });

  useEffect(() => {
    if (isEditing) {
      loadEditingWorkout();
    }
  }, [editingWorkoutId]);

  const loadEditingWorkout = async () => {
    const workouts = await loadWorkouts();
    const workoutToEdit = workouts.find(w => w.id === parseInt(editingWorkoutId));
    if (workoutToEdit) {
      setWorkout(workoutToEdit);
    }
  };

  const saveWorkout = async () => {
    if (!workout.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return;
    }

    if (workout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise');
      return;
    }

    const workouts = await loadWorkouts();
    
    if (isEditing) {
      const updated = workouts.map(w => 
        w.id === parseInt(editingWorkoutId) ? { ...w, ...workout } : w
      );
      await saveWorkouts(updated);
    } else {
      const newWorkout = {
        ...workout,
        id: Date.now()
      };
      await saveWorkouts([...workouts, newWorkout]);
    }

    router.back();
  };

  const addExercise = () => {
    if (!currentExercise.name) {
      Alert.alert('Missing Exercise', 'Please select an exercise');
      return;
    }

    const validSets = currentExercise.sets.filter(set => 
      (set.weight && set.reps) || (set.distance && set.time)
    );

    if (validSets.length === 0) {
      Alert.alert('Missing Data', 'Please add at least one complete set');
      return;
    }

    const exercise = {
      name: currentExercise.name,
      sets: validSets.map(set => ({
        weight: parseFloat(set.weight) || 0,
        reps: parseInt(set.reps) || 0,
        distance: parseFloat(set.distance) || 0,
        time: parseInt(set.time) || 0
      }))
    };

    if (editingExerciseIndex !== null) {
      const updated = [...workout.exercises];
      updated[editingExerciseIndex] = exercise;
      setWorkout({ ...workout, exercises: updated });
      setEditingExerciseIndex(null);
    } else {
      setWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
    }

    setCurrentExercise({ name: '', sets: [{ weight: '', reps: '', distance: '', time: '' }] });
    setShowExercisePicker(false);
  };

  const deleteExercise = (index) => {
    Alert.alert(
      'Delete Exercise',
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
      sets: [...currentExercise.sets, { weight: '', reps: '', distance: '', time: '' }]
    });
  };

  const removeSet = (index) => {
    const updated = currentExercise.sets.filter((_, i) => i !== index);
    setCurrentExercise({ ...currentExercise, sets: updated });
  };

  const updateSet = (index, field, value) => {
    const updated = [...currentExercise.sets];
    updated[index][field] = value;
    setCurrentExercise({ ...currentExercise, sets: updated });
  };

  const isCardio = workout.type === 'Running' || workout.type === 'Cycling' || workout.type === 'Swimming';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Workout' : 'New Workout'}</Text>
        <Pressable onPress={saveWorkout} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.saveButton]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Workout Details */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Workout Name</Text>
            <TextInput
              style={styles.input}
              value={workout.name}
              onChangeText={(text) => setWorkout({ ...workout, name: text })}
              placeholder="e.g., Upper Body, Leg Day"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerContainer}>
              {WORKOUT_TYPES.map(type => (
                <Pressable
                  key={type}
                  onPress={() => setWorkout({ ...workout, type })}
                  style={[
                    styles.typeButton,
                    workout.type === type && styles.typeButtonActive
                  ]}
                >
                  <Text style={[
                    styles.typeButtonText,
                    workout.type === type && styles.typeButtonTextActive
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={workout.date}
              onChangeText={(text) => setWorkout({ ...workout, date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <Pressable
              onPress={() => {
                setEditingExerciseIndex(null);
                setCurrentExercise({ name: '', sets: [{ weight: '', reps: '', distance: '', time: '' }] });
                setShowExercisePicker(true);
              }}
              style={styles.addButton}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </Pressable>
          </View>

          {workout.exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises yet</Text>
            </View>
          ) : (
            workout.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseActions}>
                    <Pressable
                      onPress={() => {
                        setEditingExerciseIndex(index);
                        setCurrentExercise({
                          name: exercise.name,
                          sets: exercise.sets.map(s => ({
                            weight: s.weight.toString(),
                            reps: s.reps.toString(),
                            distance: s.distance.toString(),
                            time: s.time.toString()
                          }))
                        });
                        setShowExercisePicker(true);
                      }}
                      style={styles.iconButton}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteExercise(index)} style={styles.iconButton}>
                      <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
                {exercise.sets.map((set, setIdx) => (
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
            ))
          )}
        </View>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                setShowExercisePicker(false);
                setSelectedMuscleGroup(null);
              }}
            >
              <X size={24} color="#fff" strokeWidth={2} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingExerciseIndex !== null ? 'Edit Exercise' : 'Add Exercise'}
            </Text>
            <Pressable onPress={addExercise}>
              <Text style={[styles.headerButtonText, styles.saveButton]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Exercise Selection */}
            {!currentExercise.name ? (
              <>
                {!selectedMuscleGroup ? (
                  <View style={styles.muscleGrid}>
                    {Object.keys(EXERCISE_DATABASE).map(group => (
                      <Pressable
                        key={group}
                        onPress={() => setSelectedMuscleGroup(group)}
                        style={styles.muscleButton}
                      >
                        <Text style={styles.muscleButtonText}>{group}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View>
                    <Pressable
                      onPress={() => setSelectedMuscleGroup(null)}
                      style={styles.backButton}
                    >
                      <Text style={styles.backButtonText}>← Back to muscle groups</Text>
                    </Pressable>
                    {EXERCISE_DATABASE[selectedMuscleGroup].map(exercise => (
                      <Pressable
                        key={exercise}
                        onPress={() => {
                          setCurrentExercise({ ...currentExercise, name: exercise });
                          setSelectedMuscleGroup(null);
                        }}
                        style={styles.exerciseOption}
                      >
                        <Text style={styles.exerciseOptionText}>{exercise}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Selected Exercise */}
                <Text style={styles.selectedExercise}>{currentExercise.name}</Text>
                <Pressable
                  onPress={() => setCurrentExercise({ ...currentExercise, name: '' })}
                  style={styles.changeButton}
                >
                  <Text style={styles.changeButtonText}>Change Exercise</Text>
                </Pressable>

                {/* Sets */}
                <Text style={styles.setsTitle}>Sets</Text>
                {currentExercise.sets.map((set, index) => (
                  <View key={index} style={styles.setInputCard}>
                    <View style={styles.setInputHeader}>
                      <Text style={styles.setNumber}>Set {index + 1}</Text>
                      {currentExercise.sets.length > 1 && (
                        <Pressable onPress={() => removeSet(index)} style={styles.removeSetButton}>
                          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.setInputs}>
                      {isCardio ? (
                        <>
                          <TextInput
                            style={styles.setInput}
                            value={set.distance}
                            onChangeText={(text) => updateSet(index, 'distance', text)}
                            placeholder="Distance (mi)"
                            placeholderTextColor="#6B7280"
                            keyboardType="decimal-pad"
                          />
                          <TextInput
                            style={styles.setInput}
                            value={set.time}
                            onChangeText={(text) => updateSet(index, 'time', text)}
                            placeholder="Time (min)"
                            placeholderTextColor="#6B7280"
                            keyboardType="number-pad"
                          />
                        </>
                      ) : (
                        <>
                          <TextInput
                            style={styles.setInput}
                            value={set.weight}
                            onChangeText={(text) => updateSet(index, 'weight', text)}
                            placeholder="Weight (lbs)"
                            placeholderTextColor="#6B7280"
                            keyboardType="decimal-pad"
                          />
                          <TextInput
                            style={styles.setInput}
                            value={set.reps}
                            onChangeText={(text) => updateSet(index, 'reps', text)}
                            placeholder="Reps"
                            placeholderTextColor="#6B7280"
                            keyboardType="number-pad"
                          />
                        </>
                      )}
                    </View>
                  </View>
                ))}

                <Pressable onPress={addSet} style={styles.addSetButton}>
                  <Plus size={20} color="#fff" strokeWidth={2} />
                  <Text style={styles.addSetButtonText}>Add Set</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4B5563',
  },
  typeButtonActive: {
    backgroundColor: '#111827',
  },
  typeButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  editText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  setLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  setValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  muscleButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    width: '47%',
  },
  muscleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  exerciseOption: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedExercise: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  changeButton: {
    marginBottom: 24,
  },
  changeButtonText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  setsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  setInputCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  setInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  setInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  removeSetButton: {
    padding: 4,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addSetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
