import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_COLORS } from '../utils/muscleGroups';
import { EQUIPMENT_TYPES, EQUIPMENT_LABELS } from '../constants/exerciseMetadata';
import { generateWorkout, durationToExerciseCount } from '../utils/workoutGenerator';
import GeneratedWorkoutPreview from '../components/GeneratedWorkoutPreview';

const ONBOARDING_KEY = '@traintrack_onboarding';

const DURATION_OPTIONS = [20, 30, 45, 60, 75, 90];

const GOAL_OPTIONS = [
  { id: 'strength', label: 'Strength', description: '4-5 reps, heavy' },
  { id: 'hypertrophy', label: 'Hypertrophy', description: '8-12 reps, moderate' },
  { id: 'endurance', label: 'Endurance', description: '15-20 reps, light' },
];

const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const QUICK_PRESETS = [
  { label: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  { label: 'Pull', muscles: ['back', 'biceps'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { label: 'Upper', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { label: 'Full Body', muscles: [...MUSCLE_GROUPS] },
];

export default function WorkoutGeneratorScreen() {
  const router = useRouter();

  // Form state
  const [targetMuscles, setTargetMuscles] = useState([]);
  const [workoutGoal, setWorkoutGoal] = useState('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [equipment, setEquipment] = useState([...EQUIPMENT_TYPES]);
  const [duration, setDuration] = useState(45);
  const [exerciseCount, setExerciseCount] = useState(6);
  const [exerciseCountOverridden, setExerciseCountOverridden] = useState(false);

  // Preview state
  const [generatedWorkout, setGeneratedWorkout] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load onboarding defaults
  useEffect(() => {
    loadDefaults();
  }, []);

  // Update exercise count when duration changes (unless overridden)
  useEffect(() => {
    if (!exerciseCountOverridden) {
      setExerciseCount(durationToExerciseCount(duration));
    }
  }, [duration, exerciseCountOverridden]);

  const loadDefaults = async () => {
    try {
      const data = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
        if (parsed.fitnessGoal) {
          const goalMap = {
            strength: 'strength',
            endurance: 'endurance',
            general: 'hypertrophy',
            weight_loss: 'endurance',
          };
          setWorkoutGoal(goalMap[parsed.fitnessGoal] || 'hypertrophy');
        }
      }
    } catch (e) {
      // Use defaults
    }
  };

  const toggleMuscle = (muscle) => {
    setTargetMuscles(prev =>
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  const applyPreset = (preset) => {
    setTargetMuscles(preset.muscles);
  };

  const toggleEquipment = (eq) => {
    setEquipment(prev =>
      prev.includes(eq)
        ? prev.filter(e => e !== eq)
        : [...prev, eq]
    );
  };

  const selectAllEquipment = () => setEquipment([...EQUIPMENT_TYPES]);
  const bodyweightOnly = () => setEquipment(['bodyweight']);

  const adjustExerciseCount = (delta) => {
    setExerciseCountOverridden(true);
    setExerciseCount(prev => Math.max(3, Math.min(12, prev + delta)));
  };

  const handleGenerate = () => {
    if (targetMuscles.length === 0) {
      Alert.alert('Select Muscles', 'Pick at least one target muscle group.');
      return;
    }
    if (equipment.length === 0) {
      Alert.alert('Select Equipment', 'Pick at least one equipment type.');
      return;
    }

    const result = generateWorkout({
      targetMuscleGroups: targetMuscles,
      experienceLevel,
      availableEquipment: equipment,
      exerciseCount,
      workoutGoal,
    });

    setGeneratedWorkout(result);
    setShowPreview(true);
  };

  const handleRegenerate = () => {
    const result = generateWorkout({
      targetMuscleGroups: targetMuscles,
      experienceLevel,
      availableEquipment: equipment,
      exerciseCount,
      workoutGoal,
    });
    setGeneratedWorkout(result);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <Zap size={20} color={COLORS.accent.primary} strokeWidth={2.5} />
          <Text style={styles.headerTitle}>GENERATE WORKOUT</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Target Muscles */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TARGET MUSCLES</Text>
          <View style={styles.presetRow}>
            {QUICK_PRESETS.map(preset => {
              const isActive = preset.muscles.length === targetMuscles.length &&
                preset.muscles.every(m => targetMuscles.includes(m));
              return (
                <Pressable
                  key={preset.label}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.chipGrid}>
            {MUSCLE_GROUPS.map(muscle => {
              const isSelected = targetMuscles.includes(muscle);
              const color = MUSCLE_GROUP_COLORS[muscle] || COLORS.text.tertiary;
              return (
                <Pressable
                  key={muscle}
                  style={[
                    styles.muscleChip,
                    isSelected && { backgroundColor: color + '25', borderColor: color + '60' },
                  ]}
                  onPress={() => toggleMuscle(muscle)}
                >
                  {isSelected && (
                    <Check size={12} color={color} strokeWidth={3} />
                  )}
                  <Text style={[
                    styles.muscleChipText,
                    isSelected && { color },
                  ]}>
                    {MUSCLE_GROUP_LABELS[muscle]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Workout Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WORKOUT GOAL</Text>
          <View style={styles.goalRow}>
            {GOAL_OPTIONS.map(goal => {
              const isSelected = workoutGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  style={[styles.goalCard, isSelected && styles.goalCardActive]}
                  onPress={() => setWorkoutGoal(goal.id)}
                >
                  <Text style={[styles.goalLabel, isSelected && styles.goalLabelActive]}>
                    {goal.label}
                  </Text>
                  <Text style={[styles.goalDesc, isSelected && styles.goalDescActive]}>
                    {goal.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXPERIENCE LEVEL</Text>
          <View style={styles.levelRow}>
            {LEVEL_OPTIONS.map(level => {
              const isSelected = experienceLevel === level.id;
              return (
                <Pressable
                  key={level.id}
                  style={[styles.levelChip, isSelected && styles.levelChipActive]}
                  onPress={() => setExperienceLevel(level.id)}
                >
                  <Text style={[styles.levelChipText, isSelected && styles.levelChipTextActive]}>
                    {level.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AVAILABLE EQUIPMENT</Text>
          <View style={styles.equipmentQuickRow}>
            <Pressable style={styles.equipQuickButton} onPress={selectAllEquipment}>
              <Text style={styles.equipQuickText}>Select All</Text>
            </Pressable>
            <Pressable style={styles.equipQuickButton} onPress={bodyweightOnly}>
              <Text style={styles.equipQuickText}>Bodyweight Only</Text>
            </Pressable>
          </View>
          <View style={styles.chipGrid}>
            {EQUIPMENT_TYPES.map(eq => {
              const isSelected = equipment.includes(eq);
              return (
                <Pressable
                  key={eq}
                  style={[styles.equipChip, isSelected && styles.equipChipActive]}
                  onPress={() => toggleEquipment(eq)}
                >
                  {isSelected && (
                    <Check size={12} color={COLORS.accent.primary} strokeWidth={3} />
                  )}
                  <Text style={[styles.equipChipText, isSelected && styles.equipChipTextActive]}>
                    {EQUIPMENT_LABELS[eq]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Duration & Exercise Count */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DURATION</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map(mins => {
              const isSelected = duration === mins;
              return (
                <Pressable
                  key={mins}
                  style={[styles.durationChip, isSelected && styles.durationChipActive]}
                  onPress={() => {
                    setDuration(mins);
                    setExerciseCountOverridden(false);
                  }}
                >
                  <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                    {mins}
                  </Text>
                  <Text style={[styles.durationUnit, isSelected && styles.durationUnitActive]}>
                    min
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.exerciseCountRow}>
            <Text style={styles.exerciseCountLabel}>Exercises</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => adjustExerciseCount(-1)}
              >
                <Minus size={16} color={COLORS.text.primary} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.stepperValue}>{exerciseCount}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => adjustExerciseCount(1)}
              >
                <Plus size={16} color={COLORS.text.primary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.generateButton} onPress={handleGenerate}>
          <Zap size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
          <Text style={styles.generateText}>Generate Workout</Text>
        </Pressable>
      </View>

      {/* Preview Modal */}
      <GeneratedWorkoutPreview
        visible={showPreview}
        workout={generatedWorkout}
        onClose={() => setShowPreview(false)}
        onRegenerate={handleRegenerate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text.primary,
    letterSpacing: 1.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },

  // Quick presets
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  presetChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  presetChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  presetChipTextActive: {
    color: COLORS.accent.primary,
  },

  // Muscle chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  muscleChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // Goal cards
  goalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  goalCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
  },
  goalCardActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  goalLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  goalLabelActive: {
    color: COLORS.accent.primary,
  },
  goalDesc: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  goalDescActive: {
    color: COLORS.text.secondary,
  },

  // Level chips
  levelRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  levelChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
  },
  levelChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  levelChipText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  levelChipTextActive: {
    color: COLORS.accent.primary,
  },

  // Equipment
  equipmentQuickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  equipQuickButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  equipQuickText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  equipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  equipChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  equipChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  equipChipTextActive: {
    color: COLORS.accent.primary,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  durationChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  durationText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  durationTextActive: {
    color: COLORS.accent.primary,
  },
  durationUnit: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
  },
  durationUnitActive: {
    color: COLORS.text.secondary,
  },

  // Exercise count stepper
  exerciseCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  exerciseCountLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.accent.primary,
    minWidth: 28,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + 16,
    backgroundColor: COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 2,
  },
  generateText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.text.inverse,
  },
});
