import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Activity, Bike, Dumbbell, Edit2, FileText, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { loadWorkouts, saveWorkouts } from '../utils/storage';
import { formatDateShort } from '../utils/dateFormatter';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';

export default function ActivitiesScreen() {
  const [sections, setSections] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await loadWorkouts();
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));

    const grouped = {};
    sorted.forEach(workout => {
      const date = new Date(workout.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }).toUpperCase();

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          title: monthName,
          data: []
        };
      }
      grouped[monthKey].data.push(workout);
    });

    const sectionsArray = Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.data[0].date);
      const dateB = new Date(b.data[0].date);
      return dateB - dateA;
    });

    setSections(sectionsArray);
  };

  const getWorkoutIcon = (type) => {
    const icons = {
      'Strength': Dumbbell,
      'Running': Activity,
      'Cycling': Bike,
      'Swimming': Activity,
      'Other': Activity
    };
    return icons[type] || Activity;
  };

  const getWorkoutColor = (type) => {
    return COLORS.workoutTypes[type] || COLORS.text.tertiary;
  };

  const deleteWorkout = async (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const allWorkouts = sections.flatMap(s => s.data);
            const updated = allWorkouts.filter(w => w.id !== workoutId);
            await saveWorkouts(updated);
            loadData();
            setSelectedWorkout(null);
          }
        }
      ]
    );
  };

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{data.length}</Text>
      </View>
    </View>
  );

  const renderWorkout = ({ item: workout }) => {
    const Icon = getWorkoutIcon(workout.type);
    const color = getWorkoutColor(workout.type);

    return (
      <Pressable
        onPress={() => setSelectedWorkout(workout)}
        style={styles.workoutCard}
      >
        <View style={[styles.workoutAccent, { backgroundColor: color }]} />
        <View style={styles.workoutContent}>
          <View style={[styles.workoutIconContainer, { backgroundColor: color + '15' }]}>
            <Icon size={22} color={color} strokeWidth={2.5} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <View style={styles.workoutMetaRow}>
              <Text style={styles.workoutDate}>{formatDateShort(workout.date)}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.workoutExercises}>
                {workout.exercises?.length || 0} exercises
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => deleteWorkout(workout.id)}
            style={styles.deleteButton}
            hitSlop={8}
          >
            <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderWorkout}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Activity size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
            <Text style={styles.emptySubtext}>
              Tap the button below to log your first workout
            </Text>
          </View>
        }
      />

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <View style={styles.modal}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedWorkout(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalIconContainer,
                { backgroundColor: getWorkoutColor(selectedWorkout.type) + '15' }
              ]}>
                {React.createElement(getWorkoutIcon(selectedWorkout.type), {
                  size: 28,
                  color: getWorkoutColor(selectedWorkout.type),
                  strokeWidth: 2.5
                })}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedWorkout.date} • {selectedWorkout.type}
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setSelectedWorkout(null);
                    router.push({
                      pathname: '/workout-builder',
                      params: {
                        workoutId: selectedWorkout.id,
                        returnTo: 'activities'
                      }
                    });
                  }}
                  style={styles.editButton}
                >
                  <Edit2 size={20} color={COLORS.accent.primary} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalScroll}>
              {selectedWorkout.exercises?.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.sets?.map((set, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>SET {setIdx + 1}</Text>
                      <Text style={styles.setValue}>
                        {set.distance > 0 && set.time > 0
                          ? `${set.distance} mi • ${set.time} min${set.pace > 0 ? ` • ${set.pace} min/mi` : ''}`
                          : `${set.weight} lbs × ${set.reps} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Floating Action Buttons */}
      {!selectedWorkout && (
        <View style={styles.fabContainer}>
          <Pressable
            style={styles.fabSecondary}
            onPress={() => router.push('/templates')}
          >
            <FileText size={22} color={COLORS.tertiary.primary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            style={styles.fab}
            onPress={() => router.push('/workout-builder')}
          >
            <Plus size={28} color={COLORS.text.inverse} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionHeaderText: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  sectionBadge: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '700',
  },

  // Workout Card
  workoutCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  workoutAccent: {
    width: 4,
  },
  workoutContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingLeft: SPACING.md,
    gap: SPACING.md,
  },
  workoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
    marginHorizontal: SPACING.sm,
  },
  workoutExercises: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  deleteButton: {
    padding: SPACING.sm,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Modal
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  exerciseName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  setLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
  },
  setValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.tertiary.dim,
    borderWidth: 1,
    borderColor: COLORS.tertiary.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
});
