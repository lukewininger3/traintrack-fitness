import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, ChevronDown, MessageSquare, Plus, Trash2, X, AlertCircle, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { EXERCISE_DATABASE, WORKOUT_TYPES } from '../constants/workoutTypes';
import { getTodayString, loadWorkouts, saveWorkouts } from '../utils/storage';

export default function WorkoutBuilderScreen() {
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const isEditing = !!editingWorkoutId;
  const scrollViewRef = useRef(null);
  const setRefs = useRef([]);

  const [workout, setWorkout] = useState({
    name: '',
    type: 'Strength',
    customType: '',
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

  const navigateBack = () => {
    if (params?.returnTo === 'activities') {
      router.push('/activities');
    } else {
      router.back();
    }
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
    } else {
      const now = new Date();
      setWorkout({
        name: '',
        type: 'Strength',
        customType: '',
        date: getTodayString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: '',
        exercises: []
      });
    }
  }, [editingWorkoutId]);

  const loadEditingWorkout = async () => {
    const workouts = await loadWorkouts();
    const workoutToEdit = workouts.find(w => w.id === parseInt(editingWorkoutId));
    if (workoutToEdit) {
      setWorkout({
        ...workoutToEdit,
        customType: workoutToEdit.customType || '',
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
                customType: newType !== 'Other' ? '' : workout.customType,
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
        customType: newType !== 'Other' ? '' : workout.customType 
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
      type: workout.type === 'Other' && workout.customType ? workout.customType : workout.type
    };
    
    if (isEditing) {
      const updated = workouts.map(w => 
        w.id === parseInt(editingWorkoutId) ? { ...w, ...workoutToSave } : w
      );
      await saveWorkouts(updated);
    } else {
      const newWorkout = {
        ...workoutToSave,
        id: Date.now()
      };
      await saveWorkouts([...workouts, newWorkout]);
    }

    navigateBack();
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
      setEditingExerciseIndex(null);
    } else {
      setWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
    }

    setCurrentExercise({ 
      name: '', 
      sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }], 
      notes: '' 
    });
    setPreviousSession(null);
    setShowExercisePicker(false);
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
  const displayType = workout.type === 'Other' && workout.customType ? workout.customType : workout.type;

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
        <Pressable onPress={navigateBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Workout' : 'New Workout'}</Text>
        <Pressable onPress={saveWorkout} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.saveButton]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
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
            <Pressable 
              style={styles.dropdownButton}
              onPress={() => setShowTypePicker(true)}
            >
              <Text style={styles.dropdownText}>{displayType}</Text>
              <ChevronDown size={20} color="#9CA3AF" strokeWidth={2} />
            </Pressable>
            
            {workout.type === 'Other' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={workout.customType}
                onChangeText={(text) => setWorkout({ ...workout, customType: text })}
                placeholder="Enter custom workout type"
                placeholderTextColor="#6B7280"
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <Pressable 
                style={[styles.dateTimeButton, { flex: 1.5 }]}
                onPress={() => {
                  const [year, month, day] = workout.date.split('-');
                  setTempDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
                  setShowDatePicker(true);
                }}
              >
                <CalendarIcon size={18} color="#9CA3AF" strokeWidth={2} />
                <Text style={styles.dateTimeText}>{workout.date}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>{workout.time}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={workout.notes}
              onChangeText={(text) => setWorkout({ ...workout, notes: text })}
              placeholder="Add workout notes..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{sectionLabel}</Text>
            <Pressable
              onPress={() => {
                setEditingExerciseIndex(null);
                setCurrentExercise({ 
                  name: '', 
                  sets: [{ weight: '', reps: '', distance: '', time: '', pace: '' }], 
                  notes: '' 
                });
                setPreviousSession(null);
                setShowExercisePicker(true);
              }}
              style={styles.addButton}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>{addButtonLabel}</Text>
            </Pressable>
          </View>

          {workout.exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{emptyStateText}</Text>
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
                        <MessageSquare size={16} color="#3B82F6" fill="#3B82F6" strokeWidth={2} />
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.exerciseActions}>
                    <Pressable
                      onPress={() => {
                        setEditingExerciseIndex(index);
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
                    <Text style={styles.setValue}>{formatSetDisplay(set)}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showTypePicker} transparent={true} animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Workout Type</Text>
            {WORKOUT_TYPES.map(type => (
              <Pressable key={type} style={[styles.pickerOption, workout.type === type && styles.pickerOptionSelected]} onPress={() => handleTypeChange(type)}>
                <Text style={[styles.pickerOptionText, workout.type === type && styles.pickerOptionTextSelected]}>{type}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {showDatePicker && (
        <Modal transparent={true} animationType="fade" visible={showDatePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <View style={styles.datePickerModal}>
              <Text style={styles.pickerTitle}>Select Date</Text>
              <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} textColor="#fff" themeVariant="dark" />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.confirmButton} onPress={confirmDate}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}

      {showTimePicker && (
        <Modal transparent={true} animationType="fade" visible={showTimePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
            <View style={styles.datePickerModal}>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <DateTimePicker value={tempTime} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleTimeChange} textColor="#fff" themeVariant="dark" />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.confirmButton} onPress={confirmTime}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}

      <Modal visible={showExercisePicker} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.exerciseModalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowExercisePicker(false); setSelectedMuscleGroup(null); setPreviousSession(null); }}>
              <X size={24} color="#fff" strokeWidth={2} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {isCurrentCardioWorkout ? (editingExerciseIndex !== null ? 'Edit Session' : 'Add Session') : (editingExerciseIndex !== null ? 'Edit Exercise' : 'Add Exercise')}
            </Text>
            <Pressable onPress={addExerciseOrSession}>
              <Text style={[styles.headerButtonText, styles.saveButton]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            {isCurrentCardioWorkout || currentExercise.name ? (
              <>
                {!isCurrentCardioWorkout && (
                  <>
                    <Text style={styles.selectedExercise}>{currentExercise.name}</Text>
                    <Pressable onPress={() => { setCurrentExercise({ ...currentExercise, name: '' }); setPreviousSession(null); }} style={styles.changeButton}>
                      <Text style={styles.changeButtonText}>Change Exercise</Text>
                    </Pressable>

                    {previousSession && (
                      <View style={styles.previousSessionBanner}>
                        <View style={styles.previousSessionHeader}>
                          <TrendingUp size={16} color="#3B82F6" strokeWidth={2} />
                          <Text style={styles.previousSessionTitle}>Last Session: {previousSession.workoutName} ({previousSession.date})</Text>
                        </View>
                        {previousSession.sets.map((set, idx) => (
                          <Text key={idx} style={styles.previousSessionText}>
                            Set {idx + 1}: {set.distance > 0 ? `${set.distance} mi • ${set.time} min${set.pace > 0 ? ` • ${set.pace} min/mi` : ''}` : `${set.weight} lbs × ${set.reps} reps`}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {!isCurrentCardioWorkout && (
                  <View style={styles.exerciseNotesSection}>
                    <View style={styles.exerciseNotesHeader}>
                      <MessageSquare size={18} color="#9CA3AF" strokeWidth={2} />
                      <Text style={styles.exerciseNotesLabel}>Notes (Optional)</Text>
                    </View>
                    <TextInput style={[styles.input, styles.notesInput]} value={currentExercise.notes} onChangeText={(text) => setCurrentExercise({ ...currentExercise, notes: text })} placeholder="Add notes..." placeholderTextColor="#6B7280" multiline numberOfLines={2} />
                  </View>
                )}

                {(isCurrentCardioWorkout || isCardioExercise(currentExercise.name)) && (
                  <View style={styles.infoBanner}>
                    <AlertCircle size={16} color="#3B82F6" strokeWidth={2} />
                    <Text style={styles.infoBannerText}>Enter any 2 values and the 3rd will auto-calculate</Text>
                  </View>
                )}

                <Text style={styles.setsTitle}>Sets</Text>
                {currentExercise.sets.map((set, index) => (
                  <View key={index} ref={el => setRefs.current[index] = el} style={styles.setInputCard}>
                    <View style={styles.setInputHeader}>
                      <Text style={styles.setNumber}>Set {index + 1}</Text>
                      {currentExercise.sets.length > 1 && (
                        <Pressable onPress={() => removeSet(index)} style={styles.removeSetButton}>
                          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.setInputs}>
                      {isCurrentCardioWorkout || isCardioExercise(currentExercise.name) ? (
                        <>
                          <View style={styles.cardioInputWrapper}>
                            <Text style={styles.cardioInputLabel}>Distance (mi)</Text>
                            <TextInput style={styles.setInput} value={set.distance} onChangeText={(text) => updateSetWithCalculation(index, 'distance', text)} onFocus={() => scrollToSet(index)} placeholder="0.0" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
                          </View>
                          <View style={styles.cardioInputWrapper}>
                            <Text style={styles.cardioInputLabel}>Time (min)</Text>
                            <TextInput style={styles.setInput} value={set.time} onChangeText={(text) => updateSetWithCalculation(index, 'time', text)} onFocus={() => scrollToSet(index)} placeholder="0.0" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
                          </View>
                          <View style={styles.cardioInputWrapper}>
                            <Text style={styles.cardioInputLabel}>Pace (min/mi)</Text>
                            <TextInput style={styles.setInput} value={set.pace} onChangeText={(text) => updateSetWithCalculation(index, 'pace', text)} onFocus={() => scrollToSet(index)} placeholder="0.0" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
                          </View>
                        </>
                      ) : (
                        <>
                          <TextInput style={styles.setInput} value={set.weight} onChangeText={(text) => updateSetWithCalculation(index, 'weight', text)} onFocus={() => scrollToSet(index)} placeholder="Weight (lbs)" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
                          <TextInput style={styles.setInput} value={set.reps} onChangeText={(text) => updateSetWithCalculation(index, 'reps', text)} onFocus={() => scrollToSet(index)} placeholder="Reps" placeholderTextColor="#6B7280" keyboardType="number-pad" />
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
            ) : (
              <>
                {!selectedMuscleGroup ? (
                  <View style={styles.muscleGrid}>
                    {Object.keys(EXERCISE_DATABASE).map(group => (
                      <Pressable key={group} onPress={() => setSelectedMuscleGroup(group)} style={styles.muscleButton}>
                        <Text style={styles.muscleButtonText}>{group}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View>
                    <Pressable onPress={() => setSelectedMuscleGroup(null)} style={styles.backButton}>
                      <Text style={styles.backButtonText}>← Back to muscle groups</Text>
                    </Pressable>
                    {EXERCISE_DATABASE[selectedMuscleGroup].map(exercise => (
                      <Pressable key={exercise} onPress={async () => { const prevSession = await findPreviousSession(exercise); setPreviousSession(prevSession); setCurrentExercise({ ...currentExercise, name: exercise }); setSelectedMuscleGroup(null); }} style={styles.exerciseOption}>
                        <Text style={styles.exerciseOptionText}>{exercise}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#374151' },
  headerButton: { padding: 8 },
  headerButtonText: { color: '#fff', fontSize: 16 },
  saveButton: { fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#374151', borderRadius: 16, padding: 16, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#4B5563', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  dropdownButton: { backgroundColor: '#4B5563', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: '#fff', fontSize: 16 },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateTimeButton: { backgroundColor: '#4B5563', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateTimeText: { color: '#fff', fontSize: 16 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: { backgroundColor: '#374151', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  exerciseCard: { backgroundColor: '#374151', borderRadius: 12, padding: 16, marginBottom: 8 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  noteIndicator: { padding: 4 },
  exerciseActions: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  editText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#4B5563', borderRadius: 8, padding: 12, marginBottom: 6 },
  setLabel: { color: '#D1D5DB', fontSize: 14, fontWeight: '500' },
  setValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: { backgroundColor: '#374151', borderRadius: 16, padding: 20, width: '80%', maxHeight: '60%' },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  pickerOption: { padding: 16, borderRadius: 8, marginBottom: 8, backgroundColor: '#4B5563' },
  pickerOptionSelected: { backgroundColor: '#111827' },
  pickerOptionText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  pickerOptionTextSelected: { fontWeight: '600' },
  datePickerModal: { backgroundColor: '#374151', borderRadius: 16, padding: 20, width: '85%' },
  confirmButton: { backgroundColor: '#111827', padding: 16, borderRadius: 8, marginTop: 16 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  exerciseModalContainer: { flex: 1, backgroundColor: '#1F2937' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalContent: { flex: 1 },
  modalContentContainer: { padding: 16, paddingBottom: 100 },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  muscleButton: { backgroundColor: '#374151', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, width: '47%' },
  muscleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#3B82F6', fontSize: 16 },
  exerciseOption: { backgroundColor: '#374151', padding: 16, borderRadius: 8, marginBottom: 8 },
  exerciseOptionText: { color: '#fff', fontSize: 16 },
  selectedExercise: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  changeButton: { marginBottom: 24 },
  changeButtonText: { color: '#3B82F6', fontSize: 14 },
  previousSessionBanner: { backgroundColor: '#1E3A5F', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  previousSessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  previousSessionTitle: { fontSize: 13, fontWeight: '600', color: '#93C5FD', flex: 1 },
  previousSessionText: { fontSize: 12, color: '#BFDBFE', marginBottom: 4, marginLeft: 24 },
  exerciseNotesSection: { marginBottom: 24 },
  exerciseNotesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  exerciseNotesLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E3A5F', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoBannerText: { color: '#93C5FD', fontSize: 13, flex: 1 },
  setsTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  setInputCard: { backgroundColor: '#374151', borderRadius: 12, padding: 16, marginBottom: 12 },
  setInputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  setNumber: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  setInputs: { flexDirection: 'row', gap: 8 },
  setInput: { flex: 1, backgroundColor: '#4B5563', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16 },
  cardioInputWrapper: { flex: 1 },
  cardioInputLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: '500' },
  removeSetButton: { padding: 4 },
  addSetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#374151', padding: 16, borderRadius: 12, marginTop: 8 },
  addSetButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
