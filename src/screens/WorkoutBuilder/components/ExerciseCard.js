import { GripVertical, MessageSquare, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

const formatSetDisplay = (set) => {
  if (set.distance > 0 || set.time > 0 || set.pace > 0) {
    const parts = [];
    if (set.distance > 0) parts.push(`${set.distance} mi`);
    if (set.time > 0) parts.push(`${set.time} min`);
    if (set.pace > 0) parts.push(`${set.pace} min/mi`);
    return parts.join(' • ');
  }
  return `${set.weight} lbs × ${set.reps} reps`;
};

export default function ExerciseCard({
  exercise,
  index,
  onEdit,
  onDelete,
  isCardioWorkout = false,
  drag,
  isActive = false,
}) {
  const label = isCardioWorkout ? 'Session' : 'Exercise';

  const handleDelete = () => {
    Alert.alert(
      `Delete ${label}`,
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(index) }
      ]
    );
  };

  return (
    <View style={[styles.exerciseCard, isActive && styles.exerciseCardDragging]}>
      <View style={styles.exerciseHeader}>
        {/* Drag Handle */}
        {drag && (
          <Pressable
            onLongPress={drag}
            delayLongPress={100}
            style={styles.dragHandle}
          >
            <GripVertical size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          </Pressable>
        )}
        <View style={[styles.exerciseNameRow, drag && { marginLeft: 0 }]}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.notes && (
            <Pressable
              onPress={() => Alert.alert('Notes', exercise.notes)}
              style={styles.noteIndicator}
            >
              <MessageSquare
                size={16}
                color={COLORS.tertiary.primary}
                fill={COLORS.tertiary.primary}
                strokeWidth={2}
              />
            </Pressable>
          )}
        </View>
        <View style={styles.exerciseActions}>
          <Pressable
            onPress={() => onEdit(index)}
            style={styles.editIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={styles.deleteIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
  );
}

const styles = StyleSheet.create({
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  exerciseCardDragging: {
    backgroundColor: COLORS.background.elevated,
    borderColor: COLORS.accent.primary,
    shadowColor: COLORS.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  dragHandle: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
    borderRadius: RADIUS.sm,
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
    gap: SPACING.sm,
    alignItems: 'center',
  },
  editIconButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.sm,
  },
  deleteIconButton: {
    padding: SPACING.sm,
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
  }
});
