import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

/**
 * Form fields for basic workout information
 * @param {Object} workout - Workout data { name, type, date, time, notes }
 * @param {Function} onWorkoutChange - Callback when workout changes: (updatedWorkout) => void
 * @param {Function} onShowTypePicker - Callback to show type picker
 * @param {Function} onShowDatePicker - Callback to show date picker
 * @param {Function} onShowTimePicker - Callback to show time picker
 * @param {string} displayType - Formatted display string for workout type
 */
export default function WorkoutFormFields({
  workout,
  onWorkoutChange,
  onShowTypePicker,
  onShowDatePicker,
  onShowTimePicker,
  displayType,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>WORKOUT NAME</Text>
        <TextInput
          style={styles.input}
          value={workout.name}
          onChangeText={(text) =>
            onWorkoutChange({ ...workout, name: text })
          }
          placeholder="e.g., Upper Body, Leg Day"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TYPE</Text>
        <Pressable style={styles.dropdownButton} onPress={onShowTypePicker}>
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
            onPress={onShowDatePicker}
          >
            <View style={styles.dateIconContainer}>
              <CalendarIcon size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.dateTimeText}>{workout.date}</Text>
          </Pressable>

          <Pressable
            style={[styles.dateTimeButton, { flex: 1 }]}
            onPress={onShowTimePicker}
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
          onChangeText={(text) =>
            onWorkoutChange({ ...workout, notes: text })
          }
          placeholder="Add workout notes..."
          placeholderTextColor={COLORS.text.tertiary}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
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
});
