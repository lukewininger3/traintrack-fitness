import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Award, TrendingDown, TrendingUp, X, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

function formatVolume(volume) {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
}

function ChangeBadge({ change }) {
  if (change === null || change === undefined) return null;

  const isPositive = change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? COLORS.success : COLORS.error;

  return (
    <View style={[styles.changeBadge, { backgroundColor: color + '15' }]}>
      <Icon size={10} color={color} strokeWidth={2.5} />
      <Text style={[styles.changeText, { color }]}>
        {isPositive ? '+' : ''}{change}%
      </Text>
    </View>
  );
}

export default function WeeklyRecapCard({ recap, onDismiss }) {
  if (!recap) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Zap size={16} color={COLORS.warning} strokeWidth={2.5} fill={COLORS.warning} />
          </View>
          <View>
            <Text style={styles.title}>WEEKLY RECAP</Text>
            <Text style={styles.subtitle}>{recap.weekLabel}</Text>
          </View>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12} style={styles.dismissButton}>
          <X size={16} color={COLORS.text.tertiary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{recap.totalWorkouts}</Text>
          <Text style={styles.statLabel}>WORKOUTS</Text>
          <ChangeBadge change={recap.workoutChange} />
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatVolume(recap.totalVolume)}</Text>
          <Text style={styles.statLabel}>VOLUME (LBS)</Text>
          <ChangeBadge change={recap.volumeChange} />
        </View>

        {recap.prsCount > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{recap.prsCount}</Text>
              <Text style={styles.statLabel}>NEW PRs</Text>
            </View>
          </>
        )}
      </View>

      {/* Muscle Groups */}
      {recap.topMuscleGroups.length > 0 && (
        <View style={styles.muscleGroups}>
          {recap.topMuscleGroups.map((mg) => (
            <View key={mg.name} style={styles.muscleGroupPill}>
              <Text style={styles.muscleGroupText}>{mg.name}</Text>
              <Text style={styles.muscleGroupCount}>{mg.count}×</Text>
            </View>
          ))}
        </View>
      )}

      {/* PR Highlights */}
      {recap.prs.length > 0 && (
        <View style={styles.prSection}>
          {recap.prs.map((pr, idx) => (
            <View key={idx} style={styles.prRow}>
              <Award size={12} color={COLORS.accent.primary} strokeWidth={2.5} />
              <Text style={styles.prText} numberOfLines={1}>
                {pr.exercise} — {pr.weight} lbs × {pr.reps}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },
  dismissButton: {
    padding: SPACING.xs,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
    fontSize: 22,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.surface.border,
  },

  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  changeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
  },

  muscleGroups: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  muscleGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background.elevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  muscleGroupText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  muscleGroupCount: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '700',
  },

  prSection: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 4,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  prText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
});
