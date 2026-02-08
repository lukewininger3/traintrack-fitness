import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  getRecoveryStatus,
} from '../../utils/muscleGroups';

// Top muscle groups to show (most commonly trained)
const DISPLAY_MUSCLES = ['chest', 'back', 'shoulders', 'quads', 'biceps'];

/**
 * RecoveryPreviewCard - Compact muscle group recovery status
 * @param {Object} muscleGroupData - From analyzeMuscleGroupCoverage()
 * @param {Function} onSeeAll - Navigate to full Analytics
 */
export default function RecoveryPreviewCard({ muscleGroupData = {}, onSeeAll }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'recovered':
      case 'untrained':
        return COLORS.success;
      case 'recent':
        return COLORS.warning;
      case 'fatigued':
        return COLORS.error;
      default:
        return COLORS.text.tertiary;
    }
  };

  const getDaysText = (days) => {
    if (days === null) return '—';
    if (days === 0) return '0d';
    if (days >= 5) return '5d+';
    return `${days}d`;
  };

  // Get muscles ready to train (recovered or untrained)
  const readyToTrain = MUSCLE_GROUPS
    .filter(m => {
      const data = muscleGroupData[m];
      const status = getRecoveryStatus(data?.daysSinceTraining);
      return status === 'recovered' || status === 'untrained';
    })
    .slice(0, 3)
    .map(m => MUSCLE_GROUP_LABELS[m]);

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(100)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>RECOVERY STATUS</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={COLORS.accent.primary} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      <View style={styles.muscleGrid}>
        {DISPLAY_MUSCLES.map((muscle) => {
          const data = muscleGroupData[muscle] || {};
          const status = getRecoveryStatus(data.daysSinceTraining);
          const color = getStatusColor(status);
          const fillWidth = status === 'fatigued' ? '100%' :
                           status === 'recent' ? '60%' :
                           status === 'recovered' ? '30%' : '0%';

          return (
            <View key={muscle} style={styles.muscleItem}>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: fillWidth, backgroundColor: color }]} />
              </View>
              <Text style={styles.muscleLabel}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
              <Text style={[styles.daysText, { color }]}>{getDaysText(data.daysSinceTraining)}</Text>
            </View>
          );
        })}
      </View>

      {readyToTrain.length > 0 && (
        <View style={styles.readySection}>
          <Text style={styles.readyLabel}>Ready to train: </Text>
          <Text style={styles.readyMuscles}>{readyToTrain.join(', ')}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  muscleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  muscleItem: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: '100%',
    height: 32,
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  barFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: RADIUS.sm,
    height: '100%',
    opacity: 0.3,
  },
  muscleLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  daysText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  readySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  readyLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  readyMuscles: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
});
