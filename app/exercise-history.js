import { router } from 'expo-router';
import { ChevronRight, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EXERCISE_DATABASE } from '../src/constants/workoutTypes';
import { loadWorkouts } from '../src/utils/storage';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';
import { useTheme } from '../src/contexts/ThemeContext';

export default function ExerciseHistoryScreen() {
  const { colors: themeColors } = useTheme();

  const [allWorkouts, setAllWorkouts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts();
    setAllWorkouts(data || []);
  };

  // Get list of exercises from workouts
  const exerciseList = useMemo(() => {
    const exercises = new Set();
    allWorkouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        if (exercise.name) exercises.add(exercise.name);
      });
    });
    return Array.from(exercises).sort();
  }, [allWorkouts]);

  // Get available muscle groups based on user's exercise history
  const availableMuscleGroups = useMemo(() => {
    const groups = new Set();
    exerciseList.forEach(exercise => {
      for (const [group, groupExercises] of Object.entries(EXERCISE_DATABASE)) {
        if (groupExercises.includes(exercise)) {
          groups.add(group);
          break;
        }
      }
    });
    return Array.from(groups).sort();
  }, [exerciseList]);

  // Filter exercises based on search and muscle group
  const filteredExercises = useMemo(() => {
    let filtered = exerciseList;

    if (selectedMuscleGroup) {
      const groupExercises = EXERCISE_DATABASE[selectedMuscleGroup] || [];
      filtered = filtered.filter(ex => groupExercises.includes(ex));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => ex.toLowerCase().includes(query));
    }

    return filtered;
  }, [exerciseList, selectedMuscleGroup, searchQuery]);

  const handleSelectExercise = (exerciseName) => {
    // Navigate to the history detail screen for this exercise
    router.push({
      pathname: '/exercise-history-detail',
      params: { exerciseName }
    });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background.primary }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.background.primary, borderBottomColor: themeColors.surface.border }]}>
          <Pressable onPress={handleClose} style={styles.backButton}>
            <X size={24} color={themeColors.text.primary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>EXERCISE HISTORY</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <Search size={18} color={themeColors.text.tertiary} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text.primary }]}
              placeholder="Search exercises..."
              placeholderTextColor={themeColors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <X size={16} color={themeColors.text.tertiary} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {/* Muscle Group Filter */}
          {availableMuscleGroups.length > 0 && (
            <View style={styles.muscleGroupContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[
                    styles.muscleGroupChip,
                    { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                    selectedMuscleGroup === null && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.accent.primary + '40' }
                  ]}
                  onPress={() => setSelectedMuscleGroup(null)}
                >
                  <Text style={[
                    styles.muscleGroupChipText,
                    { color: themeColors.text.secondary },
                    selectedMuscleGroup === null && { color: themeColors.accent.primary }
                  ]}>
                    All
                  </Text>
                </Pressable>
                {availableMuscleGroups.map((group) => (
                  <Pressable
                    key={group}
                    style={[
                      styles.muscleGroupChip,
                      { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                      selectedMuscleGroup === group && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.accent.primary + '40' }
                    ]}
                    onPress={() => setSelectedMuscleGroup(group)}
                  >
                    <Text style={[
                      styles.muscleGroupChipText,
                      { color: themeColors.text.secondary },
                      selectedMuscleGroup === group && { color: themeColors.accent.primary }
                    ]}>
                      {group}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Exercise List */}
          <View style={styles.exerciseList}>
            {filteredExercises.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: themeColors.surface.card }]}>
                <Text style={[styles.emptyStateText, { color: themeColors.text.secondary }]}>
                  No exercises found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: themeColors.text.tertiary }]}>
                  {exerciseList.length === 0
                    ? 'Complete workouts to build your exercise history'
                    : 'Try a different search or filter'}
                </Text>
              </View>
            ) : (
              filteredExercises.map((exerciseName) => (
                <Pressable
                  key={exerciseName}
                  style={[styles.exerciseItem, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                  onPress={() => handleSelectExercise(exerciseName)}
                >
                  <Text style={[styles.exerciseItemText, { color: themeColors.text.primary }]}>
                    {exerciseName}
                  </Text>
                  <ChevronRight size={18} color={themeColors.text.tertiary} />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
    paddingVertical: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    padding: 0,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  muscleGroupContainer: {
    marginBottom: SPACING.lg,
  },
  muscleGroupChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
  muscleGroupChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  exerciseList: {
    gap: SPACING.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  exerciseItemText: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  emptyState: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
});
