import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
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
  View,
} from 'react-native';
import { WORKOUT_TYPES } from '../constants/workoutTypes';
import { getTodayString, loadWorkouts, saveWorkouts } from '../utils/storage';
import { checkAndUpdatePRs } from '../utils/personalRecords';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

export default function WorkoutDetailsScreen() {
  const params = useLocalSearchParams();
  const editingWorkoutId = params?.workoutId;
  const templateId = params?.templateId;
  const repeatData = params?.repeatData;
  const editingDetails = params?.editingDetails; // Coming back from builder to edit
  const existingExercises = params?.existingExercises; // Exercises from builder
  const workoutDetails = params?.workoutDetails; // Coming from planned workout (Dashboard)

  const isEditing = !!editingWorkoutId;

  const [workout, setWorkout] = useState({
    name: '',
    type: 'Strength',
    date: getTodayString(),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    notes: '',
  });

  // Store planned workout data to pass to builder
  const [plannedExercises, setPlannedExercises] = useState([]);
  const [plannedWorkoutId, setPlannedWorkoutId] = useState(null);

  const [exercises, setExercises] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  // Load exercises if coming back from builder
  useEffect(() => {
    if (existingExercises) {
      try {
        setExercises(JSON.parse(existingExercises));
      } catch (e) {
        console.error('Failed to parse exercises:', e);
      }
    }
  }, [existingExercises]);

  const hasExercises = exercises.length > 0;

  const scrollViewRef = useRef(null);

  const scrollToInput = (y) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: y, animated: true });
    }, 100);
  };

  // Load data from editing details, existing workout, template, repeat, or planned workout
  useEffect(() => {
    if (editingDetails) {
      // Coming back from builder to edit - use the passed details
      loadFromEditingDetails();
    } else if (workoutDetails) {
      // Coming from planned workout on Dashboard
      loadFromWorkoutDetails();
    } else if (editingWorkoutId) {
      loadFromEditing();
    } else if (templateId) {
      loadFromTemplate();
    } else if (repeatData) {
      loadFromRepeat();
    }
  }, [editingDetails, workoutDetails, editingWorkoutId, templateId, repeatData]);

  const loadFromEditingDetails = () => {
    try {
      const details = JSON.parse(editingDetails);
      setWorkout({
        name: details.name || '',
        type: details.type || 'Strength',
        date: details.date || getTodayString(),
        time: details.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: details.notes || '',
      });
    } catch (e) {
      console.error('Failed to parse editing details:', e);
    }
  };

  const loadFromWorkoutDetails = () => {
    try {
      const details = JSON.parse(workoutDetails);
      setWorkout({
        name: details.name || '',
        type: details.type || 'Strength',
        date: details.date || getTodayString(),
        time: details.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: details.notes || '',
      });
      // Store planned exercises and ID to pass to builder
      if (details.plannedExercises) {
        setPlannedExercises(details.plannedExercises);
      }
      if (details.plannedWorkoutId) {
        setPlannedWorkoutId(details.plannedWorkoutId);
      }
    } catch (e) {
      console.error('Failed to parse workout details:', e);
    }
  };

  const loadFromEditing = async () => {
    const { loadWorkouts } = await import('../utils/storage');
    const workouts = await loadWorkouts({ skipBackgroundRefresh: true });
    const workoutToEdit = workouts.find(w => w.id === parseInt(editingWorkoutId));
    if (workoutToEdit) {
      setWorkout({
        name: workoutToEdit.name,
        type: workoutToEdit.type,
        date: workoutToEdit.date,
        time: workoutToEdit.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        notes: workoutToEdit.notes || '',
      });
    }
  };

  const loadFromTemplate = async () => {
    const { loadTemplates } = await import('../utils/workoutTemplates');
    const templates = await loadTemplates();
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setWorkout(prev => ({
        ...prev,
        name: template.name,
        type: template.type,
      }));
    }
  };

  const loadFromRepeat = () => {
    try {
      const data = JSON.parse(repeatData);
      setWorkout(prev => ({
        ...prev,
        name: data.name,
        type: data.type,
      }));
    } catch (e) {
      console.error('Failed to parse repeat data:', e);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        setWorkout({ ...workout, date: `${year}-${month}-${day}` });
      }
    } else {
      setTempDate(selectedDate || tempDate);
    }
  };

  const confirmDate = () => {
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempDate.getDate()).padStart(2, '0');
    setWorkout({ ...workout, date: `${year}-${month}-${day}` });
    setShowDatePicker(false);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) {
        setWorkout({
          ...workout,
          time: selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        });
      }
    } else {
      setTempTime(selectedTime || tempTime);
    }
  };

  const confirmTime = () => {
    setWorkout({
      ...workout,
      time: tempTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    });
    setShowTimePicker(false);
  };

  const handleContinue = () => {
    if (!workout.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return;
    }

    // Build workout details including planned exercises if available
    const detailsToPass = {
      ...workout,
      plannedExercises: plannedExercises.length > 0 ? plannedExercises : undefined,
      // Pass back exercises from builder round-trip so they aren't lost
      existingExercises: exercises.length > 0 ? exercises : undefined,
      plannedWorkoutId: plannedWorkoutId || undefined,
    };

    // Navigate to exercise builder with workout details
    router.push({
      pathname: '/workout-builder',
      params: {
        workoutDetails: JSON.stringify(detailsToPass),
        workoutId: editingWorkoutId,
        templateId: templateId,
        repeatData: repeatData,
      }
    });
  };

  const navigateBack = () => {
    Alert.alert(
      'Discard Workout?',
      'You\'ll lose any unsaved changes.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.replace('/activities') },
      ]
    );
  };

  const handleSave = async () => {
    if (!workout.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise');
      return;
    }

    setIsSaving(true);

    try {
      const workouts = await loadWorkouts({ skipBackgroundRefresh: true });
      const workoutToSave = {
        ...workout,
        exercises: exercises,
      };
      let savedWorkout;

      if (isEditing) {
        savedWorkout = { ...workoutToSave, id: parseInt(editingWorkoutId) };
        const updated = workouts.map(w =>
          w.id === parseInt(editingWorkoutId) ? { ...w, ...workoutToSave } : w
        );
        await saveWorkouts(updated);
      } else {
        const newId = Date.now();
        savedWorkout = { ...workoutToSave, id: newId };
        await saveWorkouts([...workouts, savedWorkout], { newWorkoutId: newId });
      }

      // Check for new PRs
      await checkAndUpdatePRs(savedWorkout);

      setIsSaving(false);
      router.replace('/activities');
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Save Error', 'Failed to save workout. Please try again.');
      setIsSaving(false);
    }
  };

  const displayType = workout.type;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={navigateBack} style={styles.discardButton}>
          <Text style={styles.discardText}>Discard</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'EDIT WORKOUT' : 'NEW WORKOUT'}
        </Text>
        {hasExercises ? (
          <Pressable
            onPress={handleSave}
            style={styles.saveButton}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, isSaving && { opacity: 0.5 }]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout Name */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WORKOUT NAME</Text>
            <TextInput
              style={styles.input}
              value={workout.name}
              onChangeText={(text) => setWorkout({ ...workout, name: text })}
              placeholder="e.g., Upper Body, Leg Day"
              placeholderTextColor={COLORS.text.tertiary}
              autoFocus={!isEditing && !templateId && !repeatData}
              onFocus={() => scrollToInput(0)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TYPE</Text>
            <Pressable style={styles.dropdownButton} onPress={() => setShowTypePicker(true)}>
              <Text style={styles.dropdownText}>{displayType}</Text>
              <View style={styles.dropdownIconContainer}>
                <ChevronDown size={18} color={COLORS.accent.primary} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DATE & TIME</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                style={[styles.dateTimeButton, { flex: 1.5 }]}
                onPress={() => {
                  setTempDate(new Date(workout.date + 'T12:00:00'));
                  setShowDatePicker(true);
                }}
              >
                <View style={styles.dateIconContainer}>
                  <CalendarIcon size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
                </View>
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

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={workout.notes}
              onChangeText={(text) => setWorkout({ ...workout, notes: text })}
              placeholder="Add workout notes..."
              placeholderTextColor={COLORS.text.tertiary}
              multiline
              numberOfLines={3}
              onFocus={() => scrollToInput(200)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue to Exercises</Text>
          <ChevronRight size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>SELECT TYPE</Text>
            {WORKOUT_TYPES.map(type => (
              <Pressable
                key={type}
                style={[styles.pickerOption, workout.type === type && styles.pickerOptionSelected]}
                onPress={() => {
                  setWorkout({ ...workout, type });
                  setShowTypePicker(false);
                }}
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
        <Modal transparent animationType="fade" visible={showDatePicker}>
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
        <Modal transparent animationType="fade" visible={showTimePicker}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  discardButton: {
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  discardText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  headerSpacer: {
    width: 60,
  },
  saveButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  dropdownText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '500',
  },
  dropdownIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background.elevated,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  dateIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.body.fontSize,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    backgroundColor: COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  continueButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
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
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  pickerOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  pickerOptionTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent.primary,
  },
  datePickerModal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  confirmButton: {
    backgroundColor: COLORS.accent.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
});
