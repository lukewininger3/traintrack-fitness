import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAllCategories } from '../../../constants/workoutTypes';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

/**
 * Form for creating/editing custom exercises
 * @param {Object} exercise - Exercise to edit (null for create new)
 * @param {Function} onSave - Callback when save is pressed: (name, category) => boolean
 * @param {Function} onCancel - Callback when cancel is pressed
 */
export default function CustomExerciseForm({ exercise, onSave, onCancel }) {
  const [name, setName] = useState(exercise?.name || '');
  const [category, setCategory] = useState(exercise?.category || 'Chest');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setCategory(exercise.category);
    } else {
      setName('');
      setCategory('Chest');
    }
    setShowDropdown(false);
  }, [exercise]);

  return (
    <View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>EXERCISE NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Cable Crossover"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>CATEGORY</Text>
        <Pressable
          onPress={() => setShowDropdown(!showDropdown)}
          style={[styles.dropdownButton, showDropdown && styles.dropdownButtonActive]}
        >
          <Text style={styles.dropdownText}>{category}</Text>
          <View style={styles.dropdownIconContainer}>
            <ChevronDown size={18} color={COLORS.accent.primary} strokeWidth={2.5} />
          </View>
        </Pressable>

        {showDropdown && (
          <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
            {getAllCategories().map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  setShowDropdown(false);
                }}
                style={[
                  styles.dropdownItem,
                  category === cat && styles.dropdownItemSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    category === cat && styles.dropdownItemTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.formButtonRow}>
        {exercise && (
          <Pressable
            onPress={onCancel}
            style={[styles.formButton, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => onSave(name, category)}
          style={[
            styles.formButton,
            styles.saveFormButton,
            !exercise && { flex: 1 },
          ]}
        >
          <Text style={styles.saveFormButtonText}>
            {exercise ? 'Save Changes' : 'Create Exercise'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: SPACING.md,
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
  dropdownButtonActive: {
    borderColor: COLORS.surface.borderAccent,
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
  dropdownList: {
    maxHeight: 200,
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  dropdownItemText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.body.fontSize,
  },
  dropdownItemTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  formButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
  },
  saveFormButton: {
    backgroundColor: COLORS.accent.primary,
  },
  saveFormButtonText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
  },
});
