import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS } from '../../theme/design';

/**
 * Skeleton Component
 *
 * Animated placeholder for loading states with pulse/shimmer effect.
 *
 * @param {number} width - Width of skeleton (default: '100%')
 * @param {number} height - Height of skeleton
 * @param {number} borderRadius - Border radius (default: RADIUS.md)
 * @param {object} style - Additional styles
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.md,
  style,
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * SkeletonText - Skeleton for text lines
 */
export function SkeletonText({
  lines = 1,
  lineHeight = 16,
  spacing = SPACING.sm,
  lastLineWidth = '60%',
  style,
}) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
          style={index < lines - 1 ? { marginBottom: spacing } : null}
        />
      ))}
    </View>
  );
}

/**
 * SkeletonCircle - Circular skeleton for avatars, icons
 */
export function SkeletonCircle({ size = 40, style }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

/**
 * SkeletonCard - Full card skeleton with common layout
 */
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonCircle size={44} />
        <View style={styles.cardHeaderText}>
          <Skeleton width={120} height={18} style={{ marginBottom: SPACING.xs }} />
          <Skeleton width={80} height={14} />
        </View>
      </View>
      <SkeletonText lines={2} style={{ marginTop: SPACING.md }} />
    </View>
  );
}

/**
 * SkeletonWorkoutCard - Skeleton specifically for workout cards
 */
export function SkeletonWorkoutCard({ style }) {
  return (
    <View style={[styles.workoutCard, style]}>
      <View style={styles.workoutCardLeft}>
        <SkeletonCircle size={44} />
      </View>
      <View style={styles.workoutCardContent}>
        <Skeleton width={140} height={18} style={{ marginBottom: SPACING.xs }} />
        <Skeleton width={100} height={14} style={{ marginBottom: SPACING.sm }} />
        <View style={styles.workoutCardStats}>
          <Skeleton width={60} height={12} />
          <Skeleton width={60} height={12} style={{ marginLeft: SPACING.md }} />
        </View>
      </View>
    </View>
  );
}

/**
 * SkeletonStatCard - Skeleton for stat cards
 */
export function SkeletonStatCard({ style }) {
  return (
    <View style={[styles.statCard, style]}>
      <Skeleton width={80} height={12} style={{ marginBottom: SPACING.sm }} />
      <Skeleton width={60} height={32} style={{ marginBottom: SPACING.xs }} />
      <Skeleton width={100} height={14} />
    </View>
  );
}

/**
 * SkeletonChart - Skeleton for charts
 */
export function SkeletonChart({ height = 200, style }) {
  return (
    <View style={[styles.chart, { height }, style]}>
      <View style={styles.chartBars}>
        {[0.6, 0.8, 0.4, 0.9, 0.5, 0.7].map((h, i) => (
          <Skeleton
            key={i}
            width={24}
            height={`${h * 100}%`}
            style={styles.chartBar}
          />
        ))}
      </View>
      <Skeleton width="100%" height={1} style={{ marginTop: SPACING.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
  },

  // Card skeleton
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: SPACING.md,
    flex: 1,
  },

  // Workout card skeleton
  workoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    flexDirection: 'row',
  },
  workoutCardLeft: {
    marginRight: SPACING.md,
  },
  workoutCardContent: {
    flex: 1,
  },
  workoutCardStats: {
    flexDirection: 'row',
  },

  // Stat card skeleton
  statCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },

  // Chart skeleton
  chart: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
  },
  chartBar: {
    marginHorizontal: SPACING.xs,
  },
});

export default Skeleton;
