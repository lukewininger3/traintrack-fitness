import { Dumbbell, RefreshCw, X, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { getTodayString } from '../utils/storage';
import { MUSCLE_GROUP_COLORS } from '../utils/muscleGroups';

export default function GeneratedWorkoutPreview({ visible, workout, onClose, onRegenerate }) {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState(workout?.name || '');

  React.useEffect(() => {
    if (workout?.name) setWorkoutName(workout.name);
  }, [workout?.name]);

  if (!workout) return null;

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const compoundCount = workout.exercises.filter(ex => ex.isCompound).length;

  const handleStartWorkout = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const time = `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    const workoutDetails = {
      name: workoutName.trim() || workout.name,
      type: 'Strength',
      date: getTodayString(),
      time,
      notes: '',
      plannedExercises: workout.exercises.map(ex => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          weight: 0,
          reps: 0,
        })),
      })),
    };

    onClose();

    setTimeout(() => {
      router.push({
        pathname: '/workout-details',
        params: {
          workoutDetails: JSON.stringify(workoutDetails),
        },
      });
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>YOUR WORKOUT</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.text.secondary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Workout Name */}
          <View style={styles.nameSection}>
            <TextInput
              style={styles.nameInput}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout Name"
              placeholderTextColor={COLORS.text.tertiary}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.exercises.length}</Text>
              <Text style={styles.statLabel}>EXERCISES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>TOTAL SETS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{compoundCount}</Text>
              <Text style={styles.statLabel}>COMPOUNDS</Text>
            </View>
          </View>

          {/* Exercise List */}
          {workout.exercises.map((exercise, index) => (
            <View key={`${exercise.name}-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIndex}>
                  <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    {exercise.primaryMuscles?.slice(0, 2).map(muscle => (
                      <View
                        key={muscle}
                        style={[
                          styles.muscleBadge,
                          { backgroundColor: (MUSCLE_GROUP_COLORS[muscle] || COLORS.text.tertiary) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.muscleBadgeText,
                            { color: MUSCLE_GROUP_COLORS[muscle] || COLORS.text.tertiary },
                          ]}
                        >
                          {muscle}
                        </Text>
                      </View>
                    ))}
                    <View style={[
                      styles.typeBadge,
                      exercise.isCompound ? styles.compoundBadge : styles.isolationBadge,
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        exercise.isCompound ? styles.compoundText : styles.isolationText,
                      ]}>
                        {exercise.isCompound ? 'Compound' : 'Isolation'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.setsRepsRow}>
                <Dumbbell size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                <Text style={styles.setsRepsText}>
                  {exercise.sets} sets x {exercise.reps} reps
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.regenerateButton} onPress={onRegenerate}>
            <RefreshCw size={18} color={COLORS.accent.primary} strokeWidth={2} />
            <Text style={styles.regenerateText}>Regenerate</Text>
          </Pressable>
          <Pressable style={styles.startButton} onPress={handleStartWorkout}>
            <Zap size={18} color={COLORS.text.inverse} strokeWidth={2.5} />
            <Text style={styles.startText}>Start Workout</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.text.tertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text.primary,
    letterSpacing: 1.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  nameSection: {
    marginBottom: SPACING.lg,
  },
  nameInput: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.statSmall,
    color: COLORS.accent.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.surface.border,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  exerciseIndexText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  exerciseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  muscleBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  muscleBadgeText: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
  },
  typeBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  compoundBadge: {
    backgroundColor: COLORS.tertiary.dim,
  },
  isolationBadge: {
    backgroundColor: 'rgba(163, 163, 163, 0.15)',
  },
  typeBadgeText: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
  },
  compoundText: {
    color: COLORS.tertiary.primary,
  },
  isolationText: {
    color: COLORS.text.tertiary,
  },
  setsRepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: 36,
  },
  setsRepsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + 16,
    backgroundColor: COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    paddingVertical: SPACING.md,
  },
  regenerateText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  startButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  startText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
});
