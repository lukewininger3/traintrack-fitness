import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Activity, Bike, ChevronLeft, Copy, Dumbbell, FileText, Play, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';
import {
  loadTemplates,
  deleteTemplate,
  duplicateTemplate
} from '../utils/workoutTemplates';
import { getTodayString } from '../utils/dateFormatter';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await loadTemplates();
    setTemplates(data);
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

  const handleDelete = async (templateId) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(templateId);
            setSelectedTemplate(null);
            loadData();
          }
        }
      ]
    );
  };

  const handleDuplicate = async (templateId) => {
    try {
      await duplicateTemplate(templateId);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(null);
    router.push({
      pathname: '/workout-details',
      params: {
        templateId: template.id,
        returnTo: 'templates'
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderTemplate = ({ item: template }) => {
    const Icon = getWorkoutIcon(template.type);
    const color = getWorkoutColor(template.type);
    const exerciseCount = template.exercises?.length || 0;

    return (
      <Pressable
        onPress={() => setSelectedTemplate(template)}
        style={styles.templateCard}
      >
        <View style={[styles.templateAccent, { backgroundColor: color }]} />
        <View style={styles.templateContent}>
          <View style={[styles.templateIconContainer, { backgroundColor: color + '15' }]}>
            <Icon size={22} color={color} strokeWidth={2.5} />
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{template.name}</Text>
            <View style={styles.templateMetaRow}>
              <Text style={styles.templateType}>{template.type}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.templateExercises}>
                {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleUseTemplate(template)}
            style={styles.useButton}
            hitSlop={8}
          >
            <Play size={18} color={COLORS.accent.primary} strokeWidth={2.5} fill={COLORS.accent.primary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/activities')} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>TEMPLATES</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTemplate}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <FileText size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>NO TEMPLATES YET</Text>
            <Text style={styles.emptySubtext}>
              Save a workout as a template to quickly{'\n'}repeat your favorite routines
            </Text>
          </View>
        }
      />

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <View style={styles.modal}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedTemplate(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalIconContainer,
                { backgroundColor: getWorkoutColor(selectedTemplate.type) + '15' }
              ]}>
                {React.createElement(getWorkoutIcon(selectedTemplate.type), {
                  size: 28,
                  color: getWorkoutColor(selectedTemplate.type),
                  strokeWidth: 2.5
                })}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedTemplate.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedTemplate.type} • {selectedTemplate.exercises?.length || 0} exercises
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handleUseTemplate(selectedTemplate)}
                style={[styles.actionButton, styles.actionButtonPrimary]}
              >
                <Play size={20} color={COLORS.text.inverse} strokeWidth={2.5} fill={COLORS.text.inverse} />
                <Text style={styles.actionButtonTextPrimary}>Start Workout</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDuplicate(selectedTemplate.id)}
                style={styles.actionButton}
              >
                <Copy size={20} color={COLORS.accent.primary} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(selectedTemplate.id)}
                style={styles.actionButton}
              >
                <Trash2 size={20} color={COLORS.error} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedTemplate.exercises?.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.sets?.map((set, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>SET {setIdx + 1}</Text>
                      <Text style={styles.setValue}>
                        {set.distance > 0 && set.time > 0
                          ? `${set.distance} mi • ${set.time} min`
                          : `${set.weight} lbs × ${set.reps} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <Text style={styles.createdDate}>
              Created {formatDate(selectedTemplate.createdAt)}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
    flex: 1,
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 40,
  },

  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },

  // Template Card
  templateCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  templateAccent: {
    width: 4,
  },
  templateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingLeft: SPACING.md,
    gap: SPACING.md,
  },
  templateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  templateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateType: {
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
  templateExercises: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  useButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 22,
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
    paddingBottom: SPACING.md,
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

  // Action Row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    width: 'auto',
    backgroundColor: COLORS.accent.primary,
    borderColor: COLORS.accent.primary,
    gap: SPACING.sm,
  },
  actionButtonTextPrimary: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.inverse,
  },

  // Exercise Cards
  modalScroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
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

  createdDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingBottom: SPACING.xl,
  },
});
