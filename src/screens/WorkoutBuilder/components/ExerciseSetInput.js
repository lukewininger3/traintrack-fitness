import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

/**
 * Input fields for a single exercise set
 * @param {number} setNumber - Set number (1-based)
 * @param {Object} set - Set data { weight, reps, distance, time, pace }
 * @param {boolean} isCardio - Whether this is a cardio set
 * @param {boolean} canRemove - Whether the remove button should be shown
 * @param {Function} onUpdate - Callback when a field changes: (field, value) => void
 * @param {Function} onRemove - Callback when remove is pressed
 * @param {Function} onFocus - Callback when an input is focused
 */
export default function ExerciseSetInput({
  setNumber,
  set,
  isCardio,
  canRemove,
  onUpdate,
  onRemove,
  onFocus,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.setNumberContainer}>
          <Text style={styles.setNumber}>{setNumber}</Text>
        </View>
        <Text style={styles.setLabel}>SET</Text>
        {canRemove && (
          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Trash2 size={16} color={COLORS.error} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      <View style={styles.inputs}>
        {isCardio ? (
          <>
            <View style={styles.cardioInputWrapper}>
              <Text style={styles.cardioInputLabel}>DISTANCE</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.input}
                  value={set.distance}
                  onChangeText={(text) => onUpdate('distance', text)}
                  onFocus={onFocus}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitText}>mi</Text>
              </View>
            </View>
            <View style={styles.cardioInputWrapper}>
              <Text style={styles.cardioInputLabel}>TIME</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.input}
                  value={set.time}
                  onChangeText={(text) => onUpdate('time', text)}
                  onFocus={onFocus}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitText}>min</Text>
              </View>
            </View>
            <View style={styles.cardioInputWrapper}>
              <Text style={styles.cardioInputLabel}>PACE</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.input}
                  value={set.pace}
                  onChangeText={(text) => onUpdate('pace', text)}
                  onFocus={onFocus}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitText}>/mi</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.strengthInputWrapper}>
              <Text style={styles.cardioInputLabel}>WEIGHT</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.input}
                  value={set.weight}
                  onChangeText={(text) => onUpdate('weight', text)}
                  onFocus={onFocus}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitText}>lbs</Text>
              </View>
            </View>
            <View style={styles.strengthInputWrapper}>
              <Text style={styles.cardioInputLabel}>REPS</Text>
              <TextInput
                style={styles.input}
                value={set.reps}
                onChangeText={(text) => onUpdate('reps', text)}
                onFocus={onFocus}
                placeholder="0"
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType="number-pad"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  setNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  removeButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
  },
  inputs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  strengthInputWrapper: {
    flex: 1,
  },
  cardioInputWrapper: {
    flex: 1,
  },
  cardioInputLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  unitText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.xs,
    minWidth: 24,
  },
});
