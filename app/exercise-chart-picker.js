import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Search, X } from 'lucide-react-native';
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

export default function ExerciseChartPickerScreen() {
  const { colors: themeColors } = useTheme();
  const params = useLocalSearchParams();
  const currentExercise = params?.currentExercise;

  const [exercises, setExercises] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts({ silent: true });
    const exerciseMap = {};

    (data || []).forEach(workout => {
      const workoutExercises = workout?.exercises || [];
      workoutExercises.forEach(exercise => {
        const sets = exercise?.sets || [];
        if (sets.length === 0) return;

        const maxSet = sets.reduce((max, set) =>
          (set?.weight || 0) > (max?.weight || 0) ? set : max, sets[0]
        );

        if (maxSet && maxSet.weight > 0) {
          if (!exerciseMap[exercise.name]) {
            exerciseMap[exercise.name] = [];
          }
          exerciseMap[exercise.name].push({
            date: workout.date,
            weight: maxSet.weight,
            reps: maxSet.reps || 0,
          });
        }
      });
    });

    setExercises(exerciseMap);
  };

  const exerciseList = Object.keys(exercises).sort();

  // Get available categories based on user's exercise history
  const availableCategories = useMemo(() => {
    const categories = new Set();
    exerciseList.forEach(exercise => {
      for (const [category, categoryExercises] of Object.entries(EXERCISE_DATABASE)) {
        if (categoryExercises.includes(exercise)) {
          categories.add(category);
          break;
        }
      }
    });
    return Array.from(categories).sort();
  }, [exerciseList]);

  // Filter exercises based on search and category
  const filteredExercises = useMemo(() => {
    let filtered = exerciseList;

    if (selectedCategory) {
      const categoryExercises = EXERCISE_DATABASE[selectedCategory] || [];
      filtered = filtered.filter(ex => categoryExercises.includes(ex));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => ex.toLowerCase().includes(query));
    }

    return filtered;
  }, [exerciseList, selectedCategory, searchQuery]);

  const handleSelectExercise = (exerciseName) => {
    router.back();
    // Use setTimeout to ensure navigation completes before setting params
    setTimeout(() => {
      router.setParams({ selectedChartExercise: exerciseName });
    }, 100);
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
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>SELECT EXERCISE</Text>
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

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <View style={styles.categoryContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[
                    styles.categoryChip,
                    { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                    selectedCategory === null && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.accent.primary + '40' }
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: themeColors.text.secondary },
                    selectedCategory === null && { color: themeColors.accent.primary }
                  ]}>
                    All
                  </Text>
                </Pressable>
                {availableCategories.map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                      selectedCategory === category && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.accent.primary + '40' }
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: themeColors.text.secondary },
                      selectedCategory === category && { color: themeColors.accent.primary }
                    ]}>
                      {category}
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
                    ? 'Complete workouts to track your progress'
                    : 'Try a different search or filter'}
                </Text>
              </View>
            ) : (
              filteredExercises.map((exerciseName) => (
                <Pressable
                  key={exerciseName}
                  style={[
                    styles.exerciseItem,
                    { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
                    currentExercise === exerciseName && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.accent.primary + '40' }
                  ]}
                  onPress={() => handleSelectExercise(exerciseName)}
                >
                  <View style={styles.exerciseItemContent}>
                    <Text style={[
                      styles.exerciseItemText,
                      { color: themeColors.text.primary },
                      currentExercise === exerciseName && { color: themeColors.accent.primary }
                    ]}>
                      {exerciseName}
                    </Text>
                    <Text style={[styles.exerciseItemCount, { color: themeColors.text.tertiary }]}>
                      {exercises[exerciseName]?.length || 0} sessions
                    </Text>
                  </View>
                  {currentExercise === exerciseName && (
                    <View style={[styles.selectedIndicator, { backgroundColor: themeColors.accent.primary }]} />
                  )}
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
  categoryContainer: {
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
  categoryChipText: {
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
  exerciseItemContent: {
    flex: 1,
  },
  exerciseItemText: {
    ...TYPOGRAPHY.body,
  },
  exerciseItemCount: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
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
