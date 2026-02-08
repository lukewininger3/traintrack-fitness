import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { getAllCategories } from '../constants/workoutTypes';
import {
  deleteCustomExercise,
  exerciseExists,
  loadCustomExercises,
  saveCustomExercise,
} from '../utils/customExercises';
import CustomExerciseForm from './WorkoutBuilder/components/CustomExerciseForm';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

export default function CustomExercisesScreen() {
  const [customExercises, setCustomExercises] = useState([]);
  const [editingExercise, setEditingExercise] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const customs = await loadCustomExercises();
    if (isMountedRef.current) setCustomExercises(customs);
  };

  const handleSave = async (name, category) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return false;
    }

    const { exists, type } = await exerciseExists(name);
    if (!isMountedRef.current) return false;
    if (exists && (!editingExercise || editingExercise.name !== name)) {
      Alert.alert('Duplicate Exercise', `This exercise already exists as a ${type} exercise`);
      return false;
    }

    const { error } = await saveCustomExercise(name.trim(), category, editingExercise?.id);
    if (!isMountedRef.current) return false;

    if (error) {
      Alert.alert('Error', error);
      return false;
    }

    await loadData();
    if (!isMountedRef.current) return true;
    Alert.alert('Success', editingExercise ? 'Exercise updated!' : 'Exercise created!');
    setEditingExercise(null);
    return true;
  };

  const handleDelete = (exerciseId, exerciseName) => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exerciseName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteCustomExercise(exerciseId);
            if (!isMountedRef.current) return;

            if (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            } else {
              await loadData();
              if (isMountedRef.current) Alert.alert('Success', 'Exercise deleted!');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>CUSTOM EXERCISES</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Create / Edit Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingExercise ? 'Edit Exercise' : 'Create New Exercise'}
          </Text>
          <CustomExerciseForm
            exercise={editingExercise}
            onSave={handleSave}
            onCancel={() => setEditingExercise(null)}
          />
        </View>

        {/* Exercise List */}
        {customExercises.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>YOUR CUSTOM EXERCISES</Text>
            {getAllCategories().map((category) => {
              const exercisesInCategory = customExercises.filter(
                (ex) => ex.category === category
              );
              if (exercisesInCategory.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {exercisesInCategory.map((exercise) => (
                    <View key={exercise.id} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <View style={styles.exerciseActions}>
                        <Pressable
                          onPress={() => setEditingExercise(exercise)}
                          style={styles.editButton}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(exercise.id, exercise.name)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No custom exercises yet</Text>
            <Text style={styles.emptySubtext}>
              Use the form above to create your first custom exercise
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  formCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  formTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.xl,
  },
  categoryTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.md,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  editButton: {
    padding: SPACING.xs,
  },
  editButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  emptyState: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
