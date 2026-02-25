import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, X } from 'lucide-react-native';
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
import { getTodayString, loadWorkouts, saveWorkouts, clearInProgressWorkout } from '../utils/storage';
import { checkAndUpdatePRs } from '../utils/personalRecords';
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkoutDetailsScreen() {
  const { colors: themeColors } = useTheme();
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
              await clearInProgressWorkout();
              router.replace('/activities');
            }
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
              await clearInProgressWorkout();
              router.replace('/activities');
            }
          },
        ]
      );
    }
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
        const workoutId = parseInt(editingWorkoutId);
        savedWorkout = { ...workoutToSave, id: workoutId };
        const updated = workouts.map(w =>
          w.id === workoutId ? { ...w, ...workoutToSave } : w
        );
        await saveWorkouts(updated, { updatedWorkoutId: workoutId });
      } else {
        const newId = Date.now();
        savedWorkout = { ...workoutToSave, id: newId };
        await saveWorkouts([...workouts, savedWorkout], { newWorkoutId: newId });
      }

      // Check for new PRs
      await checkAndUpdatePRs(savedWorkout);

      // Clear the in-progress workout since we've saved successfully
      await clearInProgressWorkout();

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
      style={[styles.container, { backgroundColor: themeColors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background.primary, borderBottomColor: themeColors.surface.border }]}>
        <Pressable onPress={navigateBack} style={styles.closeButton} hitSlop={12}>
          <X size={22} color={themeColors.text.secondary} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          {isEditing ? 'EDIT WORKOUT' : 'NEW WORKOUT'}
        </Text>
        {hasExercises ? (
          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: themeColors.accent.primary }]}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, { color: themeColors.text.inverse }, isSaving && { opacity: 0.5 }]}>
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
        <View style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text.tertiary }]}>WORKOUT NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background.elevated, color: themeColors.text.primary, borderColor: themeColors.surface.border }]}
              value={workout.name}
              onChangeText={(text) => setWorkout({ ...workout, name: text })}
              placeholder="e.g., Upper Body, Leg Day"
              placeholderTextColor={themeColors.text.tertiary}
              autoFocus={!isEditing && !templateId && !repeatData}
              onFocus={() => scrollToInput(0)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text.tertiary }]}>TYPE</Text>
            <Pressable style={[styles.dropdownButton, { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]} onPress={() => setShowTypePicker(true)}>
              <Text style={[styles.dropdownText, { color: themeColors.text.primary }]}>{displayType}</Text>
              <View style={[styles.dropdownIconContainer, { backgroundColor: themeColors.accent.primaryDim }]}>
                <ChevronDown size={18} color={themeColors.accent.primary} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text.tertiary }]}>DATE & TIME</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                style={[styles.dateTimeButton, { flex: 1.5, backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]}
                onPress={() => {
                  setTempDate(new Date(workout.date + 'T12:00:00'));
                  setShowDatePicker(true);
                }}
              >
                <View style={[styles.dateIconContainer, { backgroundColor: themeColors.accent.primaryDim }]}>
                  <CalendarIcon size={16} color={themeColors.accent.primary} strokeWidth={2.5} />
                </View>
                <Text style={[styles.dateTimeText, { color: themeColors.text.primary }]}>{workout.date}</Text>
              </Pressable>

              <Pressable
                style={[styles.dateTimeButton, { flex: 1, backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.dateTimeText, { color: themeColors.text.primary }]}>{workout.time}</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={[styles.label, { color: themeColors.text.tertiary }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: themeColors.background.elevated, color: themeColors.text.primary, borderColor: themeColors.surface.border }]}
              value={workout.notes}
              onChangeText={(text) => setWorkout({ ...workout, notes: text })}
              placeholder="Add workout notes..."
              placeholderTextColor={themeColors.text.tertiary}
              multiline
              numberOfLines={3}
              onFocus={() => scrollToInput(200)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.background.primary, borderTopColor: themeColors.surface.border }]}>
        <Pressable style={[styles.continueButton, { backgroundColor: themeColors.accent.primary }]} onPress={handleContinue}>
          <Text style={[styles.continueButtonText, { color: themeColors.text.inverse }]}>Continue to Exercises</Text>
          <ChevronRight size={20} color={themeColors.text.inverse} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: themeColors.background.primary }]}>
            <View style={[styles.pickerHandle, { backgroundColor: themeColors.surface.border }]} />
            <Text style={[styles.pickerTitle, { color: themeColors.text.tertiary }]}>SELECT TYPE</Text>
            {WORKOUT_TYPES.map(type => (
              <Pressable
                key={type}
                style={[styles.pickerOption, { borderBottomColor: themeColors.surface.border }, workout.type === type && { backgroundColor: themeColors.accent.primaryDim }]}
                onPress={() => {
                  setWorkout({ ...workout, type });
                  setShowTypePicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, { color: themeColors.text.primary }, workout.type === type && { color: themeColors.accent.primary }]}>
                  {type}
                </Text>
                {workout.type === type && <View style={[styles.selectedDot, { backgroundColor: themeColors.accent.primary }]} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <View style={[styles.pickerModal, { backgroundColor: themeColors.background.primary }]}>
              <View style={[styles.pickerHandle, { backgroundColor: themeColors.surface.border }]} />
              <Text style={[styles.pickerTitle, { color: themeColors.text.tertiary }]}>SELECT DATE</Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                textColor={themeColors.text.primary}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={[styles.confirmButton, { backgroundColor: themeColors.accent.primary }]} onPress={confirmDate}>
                  <Text style={[styles.confirmButtonText, { color: themeColors.text.inverse }]}>Confirm</Text>
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
            <View style={[styles.pickerModal, { backgroundColor: themeColors.background.primary }]}>
              <View style={[styles.pickerHandle, { backgroundColor: themeColors.surface.border }]} />
              <Text style={[styles.pickerTitle, { color: themeColors.text.tertiary }]}>SELECT TIME</Text>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                textColor={themeColors.text.primary}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={[styles.confirmButton, { backgroundColor: themeColors.accent.primary }]} onPress={confirmTime}>
                  <Text style={[styles.confirmButtonText, { color: themeColors.text.inverse }]}>Confirm</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
  },
  headerSpacer: {
    width: 60,
  },
  saveButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.sm,
  },
  input: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.body.fontSize,
    borderWidth: 1,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '500',
  },
  dropdownIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
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
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dateIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeText: {
    fontSize: TYPOGRAPHY.body.fontSize,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  continueButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#1F1F23',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
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
  pickerOptionText: {
    ...TYPOGRAPHY.body,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  datePickerModal: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  confirmButton: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.bodyBold,
  },
});
