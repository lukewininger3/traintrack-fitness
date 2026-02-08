import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Dumbbell, Play, Zap } from 'lucide-react-native';
import { PROGRAM_TEMPLATES } from '../constants/programTemplates';
import { getActiveProgram, startProgram } from '../utils/programs';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const LEVEL_COLORS = {
  beginner: COLORS.success,
  intermediate: COLORS.tertiary.primary,
  advanced: COLORS.secondary.primary,
};

export default function ProgramsScreen() {
  const [activeProgram, setActiveProgram] = useState(null);

  useEffect(() => {
    loadActiveProgram();
  }, []);

  const loadActiveProgram = async () => {
    const active = await getActiveProgram();
    setActiveProgram(active);
  };

  const handleStartProgram = async (programId) => {
    await startProgram(programId);
    router.push('/program-detail');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>PROGRAMS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Program Banner */}
        {activeProgram && (
          <Pressable
            style={styles.activeBanner}
            onPress={() => router.push('/program-detail')}
          >
            <View style={styles.activeBannerLeft}>
              <View style={styles.activeDot} />
              <View>
                <Text style={styles.activeBannerLabel}>ACTIVE PROGRAM</Text>
                <Text style={styles.activeBannerName}>{activeProgram.template.name}</Text>
                <Text style={styles.activeBannerMeta}>
                  Week {activeProgram.currentWeek} / Day {activeProgram.currentDay}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={COLORS.accent.primary} strokeWidth={2} />
          </Pressable>
        )}

        {/* Program Cards */}
        <Text style={styles.sectionTitle}>AVAILABLE PROGRAMS</Text>

        {PROGRAM_TEMPLATES.map((program) => {
          const isActive = activeProgram?.programId === program.id;
          const levelColor = LEVEL_COLORS[program.level] || COLORS.text.tertiary;

          return (
            <View key={program.id} style={styles.programCard}>
              <View style={styles.programCardHeader}>
                <View style={styles.programNameRow}>
                  <Text style={styles.programName}>{program.name}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + '15' }]}>
                    <Text style={[styles.levelText, { color: levelColor }]}>
                      {program.level.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.programDescription}>{program.description}</Text>
              </View>

              <View style={styles.programStats}>
                <View style={styles.programStat}>
                  <Calendar size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                  <Text style={styles.programStatText}>{program.duration} weeks</Text>
                </View>
                <View style={styles.programStatDot} />
                <View style={styles.programStat}>
                  <Dumbbell size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                  <Text style={styles.programStatText}>{program.daysPerWeek} days/week</Text>
                </View>
                <View style={styles.programStatDot} />
                <View style={styles.programStat}>
                  <Zap size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                  <Text style={styles.programStatText}>{program.schedule.length} workouts</Text>
                </View>
              </View>

              {/* Exercise Preview */}
              <View style={styles.exercisePreview}>
                {program.schedule.slice(0, 3).map((day, idx) => (
                  <View key={idx} style={styles.dayPreview}>
                    <Text style={styles.dayPreviewName}>{day.name}</Text>
                    <Text style={styles.dayPreviewExercises}>
                      {day.exercises.slice(0, 3).map(e => e.name).join(' · ')}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.startButton,
                  isActive && styles.startButtonActive,
                ]}
                onPress={() => {
                  if (isActive) {
                    router.push('/program-detail');
                  } else {
                    handleStartProgram(program.id);
                  }
                }}
              >
                <Play size={16} color={isActive ? COLORS.accent.primary : COLORS.text.inverse} strokeWidth={2.5} fill={isActive ? COLORS.accent.primary : COLORS.text.inverse} />
                <Text style={[
                  styles.startButtonText,
                  isActive && styles.startButtonTextActive,
                ]}>
                  {isActive ? 'Continue Program' : 'Start Program'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Active Banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent.primary + '40',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent.primary,
  },
  activeBannerLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.accent.primary,
  },
  activeBannerName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginTop: 2,
  },
  activeBannerMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },

  // Program Card
  programCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  programCardHeader: {
    marginBottom: SPACING.md,
  },
  programNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  programName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  levelBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  levelText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  programDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  programStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  programStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  programStatText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  programStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
    marginHorizontal: SPACING.sm,
  },

  // Exercise Preview
  exercisePreview: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dayPreview: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  dayPreviewName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  dayPreviewExercises: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  startButtonActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.accent.primary + '40',
  },
  startButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },
  startButtonTextActive: {
    color: COLORS.accent.primary,
  },
});
