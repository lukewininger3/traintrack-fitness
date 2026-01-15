import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Activity, Bike, Bookmark, Dumbbell, Edit2, FileText, MessageSquare, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal
} from 'react-native';
import { loadWorkouts, saveWorkouts } from '../utils/storage';
import { formatDateShort } from '../utils/dateFormatter';
import { saveAsTemplate } from '../utils/workoutTemplates';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';

export default function ActivitiesScreen() {
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();
  const [sections, setSections] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showNewWorkoutSheet, setShowNewWorkoutSheet] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload when screen becomes focused OR when refresh param changes
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, params.refresh]);

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
          onPress: () => {
            // Close modal immediately
            setSelectedWorkout(null);

            // Get current workouts and filter
            const allWorkouts = sections.flatMap(s => s.data);
            const updated = allWorkouts.filter(w => w.id !== workoutId);

            // Update UI immediately by filtering sections
            setSections(prevSections =>
              prevSections.map(section => ({
                ...section,
                data: section.data.filter(w => w.id !== workoutId)
              })).filter(section => section.data.length > 0)
            );

            // Persist to storage (runs in background)
            saveWorkouts(updated);
          }
        }
      ]
    );
  };

  const handleSaveAsTemplate = () => {
    setTemplateName(selectedWorkout?.name || '');
    setShowTemplateModal(true);
  };

  const confirmSaveAsTemplate = async () => {
    if (!templateName?.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }
    try {
      await saveAsTemplate(selectedWorkout, templateName.trim());
      setShowTemplateModal(false);
      setTemplateName('');
      Alert.alert('Success', 'Template saved! You can find it when starting a new workout.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const repeatWorkout = (workout) => {
    // Clone the workout data for a new workout
    const workoutData = JSON.stringify({
      name: workout.name,
      type: workout.type,
      exercises: workout.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.map(set => ({
          weight: set.weight || 0,
          reps: set.reps || 0,
          distance: set.distance || 0,
          time: set.time || 0,
          pace: set.pace || 0
        })),
        notes: ex.notes || ''
      }))
    });

    setSelectedWorkout(null);
    router.push({
      pathname: '/workout-builder',
      params: {
        repeatData: workoutData,
        returnTo: 'activities'
      }
    });
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
        accessibilityLabel={`${workout.name}, ${workout.type}, ${workout.exercises?.length || 0} exercises`}
        accessibilityRole="button"
        accessibilityHint="Opens workout details"
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
            accessibilityLabel={`Delete ${workout.name}`}
            accessibilityRole="button"
            accessibilityHint="Permanently removes this workout"
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

            {/* Header - Clean, no buttons */}
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
                  {selectedWorkout.date} • {selectedWorkout.type} • {selectedWorkout.exercises?.length || 0} exercises
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedWorkout(null)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>Done</Text>
              </Pressable>
            </View>

            {/* Scrollable Exercise List */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedWorkout.exercises?.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.notes && (
                    <View style={styles.exerciseNotesRow}>
                      <MessageSquare size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                      <Text style={styles.exerciseNotesText}>{exercise.notes}</Text>
                    </View>
                  )}
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
            </ScrollView>

            {/* Action Buttons - Bottom */}
            <View style={styles.modalActionBar}>
              <Pressable
                onPress={handleSaveAsTemplate}
                style={styles.actionButtonTertiary}
                accessibilityLabel="Save as template"
                accessibilityRole="button"
                accessibilityHint="Saves this workout as a reusable template"
              >
                <Bookmark size={20} color={COLORS.tertiary.primary} strokeWidth={2.5} />
                <Text style={styles.actionButtonTertiaryText}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => repeatWorkout(selectedWorkout)}
                style={styles.actionButtonPrimary}
                accessibilityLabel="Repeat workout"
                accessibilityRole="button"
                accessibilityHint="Creates a new workout with the same exercises"
              >
                <RotateCcw size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
                <Text style={styles.actionButtonPrimaryText}>Repeat</Text>
              </Pressable>
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
                style={styles.actionButtonSecondary}
                accessibilityLabel="Edit workout"
                accessibilityRole="button"
                accessibilityHint="Opens workout for editing"
              >
                <Edit2 size={18} color={COLORS.accent.primary} strokeWidth={2} />
                <Text style={styles.actionButtonSecondaryText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Floating Action Button */}
      {!selectedWorkout && (
        <Pressable
          style={styles.fab}
          onPress={() => setShowNewWorkoutSheet(true)}
          accessibilityLabel="Add new workout"
          accessibilityRole="button"
          accessibilityHint="Opens options to start a new workout or use a template"
        >
          <Plus size={28} color={COLORS.text.inverse} strokeWidth={2.5} />
        </Pressable>
      )}

      {/* New Workout Bottom Sheet */}
      <Modal
        visible={showNewWorkoutSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewWorkoutSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowNewWorkoutSheet(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>START WORKOUT</Text>

            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setShowNewWorkoutSheet(false);
                router.push('/workout-builder');
              }}
              accessibilityLabel="New Workout"
              accessibilityRole="button"
              accessibilityHint="Start a fresh workout from scratch"
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
                <Plus size={24} color={COLORS.accent.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>New Workout</Text>
                <Text style={styles.sheetOptionDescription}>Start fresh with a blank workout</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setShowNewWorkoutSheet(false);
                router.push('/templates');
              }}
              accessibilityLabel="From Template"
              accessibilityRole="button"
              accessibilityHint="Choose from your saved workout templates"
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: COLORS.tertiary.dim }]}>
                <FileText size={24} color={COLORS.tertiary.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>From Template</Text>
                <Text style={styles.sheetOptionDescription}>Use a saved workout template</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Save as Template Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.templateModalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable
            style={styles.templateModalDismiss}
            onPress={() => setShowTemplateModal(false)}
          />
          <View style={styles.templateModalContent}>
            <Text style={styles.templateModalTitle}>Save as Template</Text>
            <Text style={styles.templateModalSubtitle}>Enter a name for this template</Text>
            <TextInput
              style={styles.templateModalInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={COLORS.text.tertiary}
              autoFocus
            />
            <View style={styles.templateModalButtons}>
              <Pressable
                style={styles.templateModalCancel}
                onPress={() => {
                  setShowTemplateModal(false);
                  setTemplateName('');
                }}
              >
                <Text style={styles.templateModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.templateModalSave}
                onPress={confirmSaveAsTemplate}
              >
                <Bookmark size={18} color={COLORS.text.inverse} strokeWidth={2.5} />
                <Text style={styles.templateModalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            style={styles.templateModalDismiss}
            onPress={() => setShowTemplateModal(false)}
          />
        </KeyboardAvoidingView>
      </Modal>
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
    maxHeight: '85%',
    overflow: 'hidden',
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
  closeModalButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  closeModalText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  modalScrollView: {
    minHeight: 100,
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalActionBar: {
    flexDirection: 'row',
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    backgroundColor: COLORS.background.secondary,
  },
  actionButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionButtonPrimaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  actionButtonSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  actionButtonTertiary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tertiary.dim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.tertiary.primary + '40',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  actionButtonTertiaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.tertiary.primary,
  },

  // Template Modal
  templateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  templateModalDismiss: {
    flex: 1,
  },
  templateModalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  templateModalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  templateModalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  templateModalInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  templateModalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  templateModalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  templateModalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  templateModalSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tertiary.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  templateModalSaveText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
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
    marginBottom: SPACING.sm,
  },
  exerciseNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  exerciseNotesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
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
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  sheetTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  sheetOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    flex: 1,
  },
  sheetOptionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  sheetOptionDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
});
