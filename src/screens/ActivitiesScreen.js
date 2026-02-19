import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Activity, Bike, Bookmark, Dumbbell, Edit2, FileText, LayoutGrid, List, MessageSquare, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadWorkouts, saveWorkouts } from '../utils/storage';
import { deleteSharedWorkoutByWorkoutId } from '../utils/socialStorage';
import { formatDateShort } from '../utils/dateFormatter';
import { saveAsTemplate } from '../utils/workoutTemplates';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet from '../components/ui/BottomSheet';

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();
  const [sections, setSections] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showNewWorkoutSheet, setShowNewWorkoutSheet] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'expanded'

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

  // Helper to get week number for a date
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const loadData = async () => {
    const data = await loadWorkouts();
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));

    const grouped = {};
    sorted.forEach((workout, index) => {
      const date = new Date(workout.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }).toUpperCase();
      const weekKey = getWeekNumber(workout.date);

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          title: monthName,
          data: []
        };
      }

      // Check if this starts a new week within the month
      const previousInMonth = grouped[monthKey].data[grouped[monthKey].data.length - 1];
      const isNewWeek = previousInMonth && getWeekNumber(previousInMonth.date) !== weekKey;

      grouped[monthKey].data.push({ ...workout, isNewWeek });
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
    return themeColors.workoutTypes[type] || themeColors.text.tertiary;
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

            // Also delete the shared workout from social feed (non-blocking)
            deleteSharedWorkoutByWorkoutId(workoutId).catch(err => {
              console.warn('Failed to delete shared workout:', err);
            });
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
      pathname: '/workout-details',
      params: {
        repeatData: workoutData,
        returnTo: 'activities'
      }
    });
  };

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: themeColors.background.primary }]}>
      <Text style={[styles.sectionHeaderText, { color: themeColors.text.secondary }]}>{title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: themeColors.surface.card }]}>
        <Text style={[styles.sectionBadgeText, { color: themeColors.text.tertiary }]}>{data.length}</Text>
      </View>
      <View style={styles.sectionHeaderSpacer} />
      <Pressable
        style={[styles.viewToggle, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
        onPress={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')}
        hitSlop={8}
      >
        {viewMode === 'compact' ? (
          <LayoutGrid size={18} color={themeColors.text.secondary} strokeWidth={2} />
        ) : (
          <List size={18} color={themeColors.text.secondary} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );

  const renderWorkout = ({ item: workout }) => {
    const Icon = getWorkoutIcon(workout.type);
    const color = getWorkoutColor(workout.type);
    const isExpanded = viewMode === 'expanded';

    // Calculate workout summary stats
    const exerciseCount = workout.exercises?.length || 0;
    const totalSets = workout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 0;
    const totalVolume = workout.exercises?.reduce((acc, ex) => {
      return acc + (ex.sets || []).reduce((setAcc, set) => {
        if (set.weight && set.reps) {
          return setAcc + (set.weight * set.reps);
        }
        return setAcc;
      }, 0);
    }, 0) || 0;

    return (
      <>
        {workout.isNewWeek && (
          <View style={styles.weekSeparator}>
            <View style={[styles.weekSeparatorLine, { backgroundColor: themeColors.surface.border }]} />
          </View>
        )}
        <Pressable
          onPress={() => setSelectedWorkout(workout)}
          style={[styles.workoutCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }, isExpanded && styles.workoutCardExpanded]}
          accessibilityLabel={`${workout.name}, ${workout.type}, ${exerciseCount} exercises`}
          accessibilityRole="button"
          accessibilityHint="Opens workout details"
        >
          <View style={[styles.workoutAccent, { backgroundColor: color }]} />
          <View style={[styles.workoutContent, isExpanded && styles.workoutContentExpanded]}>
            <View style={styles.workoutMainRow}>
              <View style={[styles.workoutIconContainer, { backgroundColor: color + '15' }]}>
                <Icon size={22} color={color} strokeWidth={2.5} />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={[styles.workoutName, { color: themeColors.text.primary }]}>{workout.name}</Text>
                <View style={styles.workoutMetaRow}>
                  <Text style={[styles.workoutDate, { color: themeColors.text.secondary }]}>{formatDateShort(workout.date)}</Text>
                  <View style={[styles.metaDot, { backgroundColor: themeColors.text.tertiary }]} />
                  <Text style={[styles.workoutExercises, { color: themeColors.text.tertiary }]}>
                    {exerciseCount} exercises
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => deleteWorkout(workout.id)}
                style={styles.deleteButton}
                hitSlop={12}
                accessibilityLabel={`Delete ${workout.name}`}
                accessibilityRole="button"
                accessibilityHint="Permanently removes this workout"
              >
                <Trash2 size={18} color={themeColors.error} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Expanded View - Exercise Summary */}
            {isExpanded && exerciseCount > 0 && (
              <View style={[styles.expandedContent, { borderTopColor: themeColors.surface.border }]}>
                {/* Stats Row */}
                {totalVolume > 0 && (
                  <View style={styles.expandedStatsRow}>
                    <View style={styles.expandedStat}>
                      <Text style={[styles.expandedStatValue, { color: themeColors.accent.primary }]}>{totalSets}</Text>
                      <Text style={[styles.expandedStatLabel, { color: themeColors.text.tertiary }]}>sets</Text>
                    </View>
                    <View style={[styles.expandedStatDivider, { backgroundColor: themeColors.surface.border }]} />
                    <View style={styles.expandedStat}>
                      <Text style={[styles.expandedStatValue, { color: themeColors.accent.primary }]}>
                        {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
                      </Text>
                      <Text style={[styles.expandedStatLabel, { color: themeColors.text.tertiary }]}>lbs</Text>
                    </View>
                  </View>
                )}

                {/* Exercise List Preview */}
                <View style={styles.exercisePreviewList}>
                  {workout.exercises.slice(0, 4).map((exercise, idx) => {
                    const sets = exercise.sets || [];
                    const bestSet = sets.reduce((best, set) => {
                      if (set.weight && set.reps) {
                        const volume = set.weight * set.reps;
                        if (!best || volume > best.volume) {
                          return { ...set, volume };
                        }
                      }
                      if (set.distance) {
                        return { distance: set.distance, time: set.time };
                      }
                      return best;
                    }, null);

                    return (
                      <View key={idx} style={[styles.exercisePreviewItem, { backgroundColor: themeColors.background.elevated }]}>
                        <Text style={[styles.exercisePreviewName, { color: themeColors.text.primary }]} numberOfLines={1}>
                          {exercise.name}
                        </Text>
                        {bestSet && (
                          <Text style={[styles.exercisePreviewStats, { color: themeColors.text.secondary }]}>
                            {bestSet.weight
                              ? `${bestSet.weight} × ${bestSet.reps}`
                              : bestSet.distance
                              ? `${bestSet.distance} mi`
                              : `${sets.length} sets`}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  {exerciseCount > 4 && (
                    <Text style={[styles.moreExercises, { color: themeColors.text.tertiary }]}>+{exerciseCount - 4} more</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
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
            <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.surface.card }]}>
              <Activity size={48} color={themeColors.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.text.secondary }]}>NO WORKOUTS YET</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.text.tertiary }]}>
              Tap the button below to log your first workout
            </Text>
          </View>
        }
      />

      {/* Workout Detail Bottom Sheet */}
      <BottomSheet
        isVisible={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        height="80%"
        scrollable={false}
      >
        {selectedWorkout && (
          <View style={styles.sheetInner}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.surface.border }]}>
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
                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>{selectedWorkout.name}</Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                  {selectedWorkout.date} • {selectedWorkout.type} • {selectedWorkout.exercises?.length || 0} exercises
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedWorkout(null)}
                style={styles.closeModalButton}
              >
                <Text style={[styles.closeModalText, { color: themeColors.accent.primary }]}>Done</Text>
              </Pressable>
            </View>

            {/* Scrollable Exercise List */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedWorkout.exercises?.map((exercise, idx) => (
                <View key={idx} style={[styles.exerciseCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                  <Text style={[styles.exerciseName, { color: themeColors.text.primary }]}>{exercise.name}</Text>
                  {exercise.notes && (
                    <View style={[styles.exerciseNotesRow, { backgroundColor: themeColors.background.elevated }]}>
                      <MessageSquare size={14} color={themeColors.text.tertiary} strokeWidth={2} />
                      <Text style={[styles.exerciseNotesText, { color: themeColors.text.secondary }]}>{exercise.notes}</Text>
                    </View>
                  )}
                  {exercise.sets?.map((set, setIdx) => (
                    <View key={setIdx} style={[styles.setRow, { backgroundColor: themeColors.background.elevated }]}>
                      <Text style={[styles.setLabel, { color: themeColors.text.tertiary }]}>SET {setIdx + 1}</Text>
                      <Text style={[styles.setValue, { color: themeColors.text.primary }]}>
                        {set.distance > 0 && set.time > 0
                          ? `${set.distance} mi • ${set.time} min${set.pace > 0 ? ` • ${set.pace} min/mi` : ''}`
                          : `${set.weight || 0} lbs × ${set.reps || 0} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            {/* Action Buttons - Bottom */}
            <View style={[styles.modalActionBar, { paddingBottom: insets.bottom || SPACING.sm, borderTopColor: themeColors.surface.border, backgroundColor: themeColors.background.elevated }]}>
              <Pressable
                onPress={handleSaveAsTemplate}
                style={[styles.actionButtonTertiary, { backgroundColor: themeColors.tertiary.dim, borderColor: themeColors.tertiary.primary + '40' }]}
                accessibilityLabel="Save as template"
                accessibilityRole="button"
                accessibilityHint="Saves this workout as a reusable template"
              >
                <Bookmark size={20} color={themeColors.tertiary.primary} strokeWidth={2.5} />
                <Text style={[styles.actionButtonTertiaryText, { color: themeColors.tertiary.primary }]}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => repeatWorkout(selectedWorkout)}
                style={[styles.actionButtonPrimary, { backgroundColor: themeColors.accent.primary }]}
                accessibilityLabel="Repeat workout"
                accessibilityRole="button"
                accessibilityHint="Creates a new workout with the same exercises"
              >
                <RotateCcw size={20} color={themeColors.text.inverse} strokeWidth={2.5} />
                <Text style={[styles.actionButtonPrimaryText, { color: themeColors.text.inverse }]}>Repeat</Text>
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
                style={[styles.actionButtonSecondary, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                accessibilityLabel="Edit workout"
                accessibilityRole="button"
                accessibilityHint="Opens workout for editing"
              >
                <Edit2 size={18} color={themeColors.accent.primary} strokeWidth={2} />
                <Text style={[styles.actionButtonSecondaryText, { color: themeColors.accent.primary }]}>Edit</Text>
              </Pressable>
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Floating Action Button */}
      {!selectedWorkout && (
        <Pressable
          style={[styles.fab, { backgroundColor: themeColors.accent.primary }]}
          onPress={() => setShowNewWorkoutSheet(true)}
          accessibilityLabel="Add new workout"
          accessibilityRole="button"
          accessibilityHint="Opens options to start a new workout or use a template"
        >
          <Plus size={28} color={themeColors.text.inverse} strokeWidth={2.5} />
        </Pressable>
      )}

      {/* New Workout Bottom Sheet */}
      <BottomSheet
        isVisible={showNewWorkoutSheet}
        onClose={() => setShowNewWorkoutSheet(false)}
        height="35%"
      >
        <Text style={[styles.sheetTitle, { color: themeColors.text.secondary }]}>START WORKOUT</Text>

        <Pressable
          style={[styles.sheetOption, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
          onPress={() => {
            setShowNewWorkoutSheet(false);
            router.push('/workout-details');
          }}
          accessibilityLabel="New Workout"
          accessibilityRole="button"
          accessibilityHint="Start a fresh workout from scratch"
        >
          <View style={[styles.sheetOptionIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
            <Plus size={24} color={themeColors.accent.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.sheetOptionText}>
            <Text style={[styles.sheetOptionTitle, { color: themeColors.text.primary }]}>New Workout</Text>
            <Text style={[styles.sheetOptionDescription, { color: themeColors.text.tertiary }]}>Start fresh with a blank workout</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.sheetOption, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
          onPress={() => {
            setShowNewWorkoutSheet(false);
            router.push('/templates');
          }}
          accessibilityLabel="From Template"
          accessibilityRole="button"
          accessibilityHint="Choose from your saved workout templates"
        >
          <View style={[styles.sheetOptionIcon, { backgroundColor: themeColors.tertiary.dim }]}>
            <FileText size={24} color={themeColors.tertiary.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.sheetOptionText}>
            <Text style={[styles.sheetOptionTitle, { color: themeColors.text.primary }]}>From Template</Text>
            <Text style={[styles.sheetOptionDescription, { color: themeColors.text.tertiary }]}>Use a saved workout template</Text>
          </View>
        </Pressable>
      </BottomSheet>

      {/* Save as Template Modal - Centered */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.templateModalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.templateModalContent, { backgroundColor: themeColors.background.secondary }]}>
                <Text style={[styles.templateModalTitle, { color: themeColors.text.primary }]}>Save as Template</Text>
                <Text style={[styles.templateModalSubtitle, { color: themeColors.text.secondary }]}>Enter a name for this template</Text>
                <TextInput
                  style={[styles.templateModalInput, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border, color: themeColors.text.primary }]}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="Template name"
                  placeholderTextColor={themeColors.text.tertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmSaveAsTemplate}
                />
                <View style={styles.templateModalButtons}>
                  <Pressable
                    style={[styles.templateModalCancel, { backgroundColor: themeColors.surface.card }]}
                    onPress={() => {
                      setShowTemplateModal(false);
                      setTemplateName('');
                    }}
                  >
                    <Text style={[styles.templateModalCancelText, { color: themeColors.text.secondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.templateModalSave, { backgroundColor: themeColors.tertiary.primary }]}
                    onPress={confirmSaveAsTemplate}
                  >
                    <Bookmark size={18} color={themeColors.text.inverse} strokeWidth={2.5} />
                    <Text style={[styles.templateModalSaveText, { color: themeColors.text.inverse }]}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
  sectionHeaderSpacer: {
    flex: 1,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week Separator
  weekSeparator: {
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  weekSeparatorLine: {
    height: 1,
    backgroundColor: COLORS.surface.border,
    opacity: 0.6,
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
  workoutCardExpanded: {
    marginBottom: SPACING.md,
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
  workoutContentExpanded: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  workoutMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Expanded View
  expandedContent: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    marginTop: SPACING.xs,
  },
  expandedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  expandedStat: {
    alignItems: 'center',
  },
  expandedStatValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.accent.primary,
    fontSize: 18,
  },
  expandedStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  expandedStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.surface.border,
  },
  exercisePreviewList: {
    gap: SPACING.xs,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  exercisePreviewName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
  },
  exercisePreviewStats: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  moreExercises: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
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

  // Bottom Sheet Inner
  sheetInner: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    flex: 1,
  },
  modalScrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalActionBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    backgroundColor: COLORS.background.elevated,
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

  // Template Save Modal - Centered
  templateModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: SPACING.xl,
  },
  templateModalContent: {
    width: '100%',
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

  // New Workout Sheet
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
