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
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

export default function CustomExercisesScreen() {
  const { colors: themeColors } = useTheme();
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
      style={[styles.container, { backgroundColor: themeColors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background.secondary, borderBottomColor: themeColors.surface.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={themeColors.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>CUSTOM EXERCISES</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Create / Edit Form */}
        <View style={[styles.formCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Text style={[styles.formTitle, { color: themeColors.text.primary }]}>
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
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>YOUR CUSTOM EXERCISES</Text>
            {getAllCategories().map((category) => {
              const exercisesInCategory = customExercises.filter(
                (ex) => ex.category === category
              );
              if (exercisesInCategory.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: themeColors.text.primary }]}>{category}</Text>
                  {exercisesInCategory.map((exercise) => (
                    <View key={exercise.id} style={[styles.exerciseRow, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                      <Text style={[styles.exerciseName, { color: themeColors.text.primary }]} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <View style={styles.exerciseActions}>
                        <Pressable
                          onPress={() => setEditingExercise(exercise)}
                          style={styles.editButton}
                        >
                          <Text style={[styles.editButtonText, { color: themeColors.accent.primary }]}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(exercise.id, exercise.name)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={18} color={themeColors.error} strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>No custom exercises yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
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
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  formTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.xl,
  },
  categoryTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
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
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  emptyState: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
});
