import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, TrendingUp, ArrowUp } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

/**
 * StrengthPreviewCard - Compact strength gains preview
 * @param {Array} topGainers - Array of exercise objects with name, currentWeight, previousWeight, percentChange
 * @param {Function} onSeeAll - Navigate to full Analytics
 */
export default function StrengthPreviewCard({ topGainers = [], onSeeAll }) {
  // Show max 2 items for compact preview
  const displayGains = topGainers.slice(0, 2);

  if (displayGains.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(150)}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TrendingUp size={14} color={COLORS.text.secondary} strokeWidth={2.5} />
          <Text style={styles.title}>RECENT GAINS</Text>
        </View>
        {onSeeAll && topGainers.length > 2 && (
          <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={COLORS.accent.primary} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      <View style={styles.gainsList}>
        {displayGains.map((exercise, idx) => (
          <View key={idx} style={styles.gainRow}>
            <View style={styles.gainInfo}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {exercise.name}
              </Text>
              <Text style={styles.weightChange}>
                {exercise.previousWeight} → {exercise.currentWeight} lbs
              </Text>
            </View>
            <View style={styles.percentBadge}>
              <ArrowUp size={12} color={COLORS.success} strokeWidth={3} />
              <Text style={styles.percentText}>
                {exercise.percentChange.toFixed(0)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
  gainsList: {
    gap: SPACING.sm,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  gainInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  exerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  weightChange: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  percentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  percentText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.success,
  },
});
