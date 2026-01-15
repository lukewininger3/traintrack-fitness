import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  Award,
  Trophy,
  Flame,
  Target,
  Activity,
  Zap,
  Star,
  Crown,
  Gem,
  Calendar,
  TrendingUp,
  Medal,
  Sparkles,
  Lock,
  CheckCircle
} from 'lucide-react-native';
import React, { useCallback, useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  withTiming,
  interpolate,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { loadWorkouts } from '../utils/storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIER_COLORS = {
  bronze: { primary: '#CD7F32', dim: 'rgba(205, 127, 50, 0.15)' },
  silver: { primary: '#C0C0C0', dim: 'rgba(192, 192, 192, 0.15)' },
  gold: { primary: '#FFD700', dim: 'rgba(255, 215, 0, 0.15)' },
  platinum: { primary: '#E5E4E2', dim: 'rgba(229, 228, 226, 0.20)' },
  diamond: { primary: '#00D4FF', dim: 'rgba(0, 212, 255, 0.15)' }
};

export default function TrophyScreen() {
  const [badges, setBadges] = useState({
    totalWorkouts: 0,
    consecutiveWeeks: 0,
    mambaMentality: false,
    blackMamba: false,
    triathlete: false,
    multiWorkoutDays: 0
  });

  const [selectedBadge, setSelectedBadge] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const workouts = await loadWorkouts();
    calculateBadges(workouts);
  };

  const calculateBadges = (workouts) => {
    const totalWorkouts = workouts.length;
    const consecutiveWeeks = calculateConsecutiveWeeks(workouts);

    const workoutsByDate = {};
    workouts.forEach(w => {
      workoutsByDate[w.date] = (workoutsByDate[w.date] || 0) + 1;
    });

    const multiWorkoutDays = Object.values(workoutsByDate).filter(count => count > 1).length;
    const mambaMentality = multiWorkoutDays >= 1;
    const blackMamba = multiWorkoutDays >= 50;

    const workoutTypes = new Set(workouts.map(w => w.type));
    const triathlete = workoutTypes.has('Running') && workoutTypes.has('Cycling') && workoutTypes.has('Swimming');

    setBadges({
      totalWorkouts,
      consecutiveWeeks,
      mambaMentality,
      blackMamba,
      triathlete,
      multiWorkoutDays
    });
  };

  const calculateConsecutiveWeeks = (workouts) => {
    if (workouts.length === 0) return 0;

    const weekSet = new Set();
    workouts.forEach(w => {
      const date = new Date(w.date);
      const weekNumber = getISOWeek(date);
      const year = date.getFullYear();
      weekSet.add(`${year}-W${weekNumber}`);
    });

    const weeks = Array.from(weekSet).sort();
    if (weeks.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < weeks.length; i++) {
      const [prevYear, prevWeek] = weeks[i - 1].split('-W').map(Number);
      const [currYear, currWeek] = weeks[i].split('-W').map(Number);

      if (currYear === prevYear && currWeek === prevWeek + 1) {
        currentStreak++;
      } else if (currYear === prevYear + 1 && prevWeek === 52 && currWeek === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  };

  const getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const workoutBadges = [
    { id: 'w1', threshold: 1, title: 'First Step', description: 'Complete your first workout', Icon: Target, tier: 'bronze' },
    { id: 'w10', threshold: 10, title: 'Warming Up', description: '10 workouts completed', Icon: Activity, tier: 'bronze' },
    { id: 'w50', threshold: 50, title: 'Committed', description: '50 workouts completed', Icon: Flame, tier: 'silver' },
    { id: 'w100', threshold: 100, title: 'Century', description: '100 workouts completed', Icon: Medal, tier: 'gold' },
    { id: 'w500', threshold: 500, title: 'Elite', description: '500 workouts completed', Icon: Zap, tier: 'platinum' },
    { id: 'w1000', threshold: 1000, title: 'Legend', description: '1000 workouts completed', Icon: Crown, tier: 'diamond' }
  ];

  const consistencyBadges = [
    { id: 'c4', weeks: 4, title: '1 Month', description: '4 consecutive weeks', Icon: Calendar, tier: 'bronze' },
    { id: 'c26', weeks: 26, title: '6 Months', description: '26 consecutive weeks', Icon: Flame, tier: 'silver' },
    { id: 'c52', weeks: 52, title: '1 Year', description: '52 consecutive weeks', Icon: Trophy, tier: 'gold' },
    { id: 'c104', weeks: 104, title: '2 Years', description: '104 consecutive weeks', Icon: Star, tier: 'platinum' },
    { id: 'c156', weeks: 156, title: '3 Years', description: '156 consecutive weeks', Icon: Gem, tier: 'diamond' },
  ];

  const specialBadges = [
    {
      id: 'mamba',
      title: 'Mamba Mentality',
      description: 'Complete 2+ workouts in a single day',
      Icon: Zap,
      tier: 'gold',
      earned: badges.mambaMentality,
      progress: badges.multiWorkoutDays >= 1 ? 1 : 0,
      total: 1
    },
    {
      id: 'blackMamba',
      title: 'Black Mamba',
      description: '2+ workouts in a day for 50 days',
      Icon: Flame,
      tier: 'diamond',
      earned: badges.blackMamba,
      progress: badges.multiWorkoutDays,
      total: 50
    },
    {
      id: 'triathlete',
      title: 'Triathlete',
      description: 'Complete Run, Bike, and Swim workouts',
      Icon: TrendingUp,
      tier: 'platinum',
      earned: badges.triathlete,
      progress: null,
      total: null
    }
  ];

  // Calculate unlocked counts
  const unlockedWorkout = workoutBadges.filter(b => badges.totalWorkouts >= b.threshold).length;
  const unlockedConsistency = consistencyBadges.filter(b => badges.consecutiveWeeks >= b.weeks).length;
  const unlockedSpecial = specialBadges.filter(b => b.earned).length;
  const totalUnlocked = unlockedWorkout + unlockedConsistency + unlockedSpecial;
  const totalBadges = workoutBadges.length + consistencyBadges.length + specialBadges.length;

  const renderBadgeCard = (badge, earned, progress = null, threshold = null, index = 0) => {
    const tierColor = TIER_COLORS[badge.tier];
    const Icon = badge.Icon;

    const handlePress = () => {
      if (earned) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSelectedBadge({ ...badge, earned, progress, threshold });
    };

    return (
      <AnimatedPressable
        key={badge.id}
        onPress={handlePress}
        entering={FadeInDown.delay(index * 50).springify().damping(15)}
        style={[styles.badgeCard, earned && styles.badgeCardEarned]}
      >
        <Animated.View style={[
          styles.badgeIconContainer,
          { backgroundColor: earned ? tierColor.dim : COLORS.background.elevated },
          earned && { shadowColor: tierColor.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }
        ]}>
          {earned ? (
            <Icon size={28} color={tierColor.primary} strokeWidth={2.5} />
          ) : (
            <Lock size={22} color={COLORS.text.tertiary} strokeWidth={2} />
          )}
        </Animated.View>
        <Text style={[styles.badgeTitle, earned && styles.badgeTitleEarned]} numberOfLines={1}>
          {badge.title}
        </Text>
        {earned ? (
          <View style={[styles.tierPill, { backgroundColor: tierColor.dim }]}>
            <Text style={[styles.tierText, { color: tierColor.primary }]}>
              {badge.tier.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Text style={styles.badgeProgress}>
            {progress}/{threshold}
          </Text>
        )}
      </AnimatedPressable>
    );
  };

  const renderSpecialBadge = (badge, index = 0) => {
    const tierColor = TIER_COLORS[badge.tier];
    const Icon = badge.Icon;

    const handlePress = () => {
      if (badge.earned) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setSelectedBadge({ ...badge, threshold: badge.total });
    };

    return (
      <AnimatedPressable
        key={badge.id}
        onPress={handlePress}
        entering={FadeInDown.delay(index * 80).springify().damping(15)}
        style={[styles.specialBadgeCard, badge.earned && styles.specialBadgeCardEarned]}
      >
        <View style={[styles.specialAccent, { backgroundColor: badge.earned ? tierColor.primary : COLORS.surface.border }]} />
        <View style={styles.specialContent}>
          <Animated.View style={[
            styles.specialIconContainer,
            { backgroundColor: badge.earned ? tierColor.dim : COLORS.background.elevated },
            badge.earned && { shadowColor: tierColor.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 }
          ]}>
            {badge.earned ? (
              <Icon size={32} color={tierColor.primary} strokeWidth={2.5} />
            ) : (
              <Lock size={24} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Animated.View>
          <View style={styles.specialInfo}>
            <Text style={[styles.specialTitle, badge.earned && styles.specialTitleEarned]}>
              {badge.title}
            </Text>
            <Text style={styles.specialDescription}>{badge.description}</Text>
          </View>
          {badge.earned ? (
            <View style={[styles.specialTierPill, { backgroundColor: tierColor.dim }]}>
              <Trophy size={14} color={tierColor.primary} fill={tierColor.primary} strokeWidth={2} />
            </View>
          ) : badge.progress !== null && (
            <Text style={styles.specialProgress}>{badge.progress}/{badge.total}</Text>
          )}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Hero Stats */}
        <Animated.View
          entering={FadeIn.delay(100).springify()}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <Animated.View
              entering={FadeInDown.delay(200).springify().damping(12)}
              style={styles.heroIconContainer}
            >
              <Crown size={36} color={COLORS.accent.primary} fill={COLORS.accent.primary} strokeWidth={2} />
            </Animated.View>
            <View style={styles.heroStats}>
              <Text style={styles.heroNumber}>{totalUnlocked}</Text>
              <Text style={styles.heroLabel}>/ {totalBadges} BADGES</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                entering={FadeIn.delay(400)}
                style={[styles.progressFill, { width: `${(totalUnlocked / totalBadges) * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((totalUnlocked / totalBadges) * 100)}% Complete
            </Text>
          </View>
        </Animated.View>

        {/* Workout Milestones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={18} color={COLORS.accent.primary} strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>WORKOUT MILESTONES</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unlockedWorkout}/{workoutBadges.length}</Text>
            </View>
          </View>
          <View style={styles.badgeGrid}>
            {workoutBadges.map((badge, index) =>
              renderBadgeCard(
                badge,
                badges.totalWorkouts >= badge.threshold,
                badges.totalWorkouts,
                badge.threshold,
                index
              )
            )}
          </View>
        </View>

        {/* Consistency Streaks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flame size={18} color={COLORS.secondary.primary} strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>CONSISTENCY STREAKS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unlockedConsistency}/{consistencyBadges.length}</Text>
            </View>
          </View>
          <View style={styles.badgeGrid}>
            {consistencyBadges.map((badge, index) =>
              renderBadgeCard(
                badge,
                badges.consecutiveWeeks >= badge.weeks,
                badges.consecutiveWeeks,
                badge.weeks,
                index
              )
            )}
          </View>
        </View>

        {/* Special Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={COLORS.tertiary.primary} strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>SPECIAL ACHIEVEMENTS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unlockedSpecial}/{specialBadges.length}</Text>
            </View>
          </View>
          <View style={styles.specialBadgesContainer}>
            {specialBadges.map((badge, index) => renderSpecialBadge(badge, index))}
          </View>
        </View>
      </View>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <View style={styles.modal}>
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedBadge(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {(() => {
              const tierColor = TIER_COLORS[selectedBadge.tier];
              const Icon = selectedBadge.Icon;
              return (
                <>
                  <View style={[
                    styles.modalIconContainer,
                    { backgroundColor: selectedBadge.earned ? tierColor.dim : COLORS.surface.card }
                  ]}>
                    {selectedBadge.earned ? (
                      <Icon size={56} color={tierColor.primary} strokeWidth={2} />
                    ) : (
                      <Lock size={48} color={COLORS.text.tertiary} strokeWidth={2} />
                    )}
                  </View>

                  <Text style={styles.modalTitle}>{selectedBadge.title}</Text>

                  <View style={[
                    styles.modalTierPill,
                    { backgroundColor: selectedBadge.earned ? tierColor.dim : COLORS.surface.card }
                  ]}>
                    <Text style={[
                      styles.modalTierText,
                      { color: selectedBadge.earned ? tierColor.primary : COLORS.text.tertiary }
                    ]}>
                      {selectedBadge.tier.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.modalDescription}>{selectedBadge.description}</Text>

                  <View style={[
                    styles.statusPill,
                    selectedBadge.earned ? styles.statusPillUnlocked : styles.statusPillLocked
                  ]}>
                    {selectedBadge.earned ? (
                      <>
                        <CheckCircle size={18} color={COLORS.success} strokeWidth={2.5} />
                        <Text style={styles.statusTextUnlocked}>UNLOCKED</Text>
                      </>
                    ) : (
                      <>
                        <Lock size={18} color={COLORS.text.tertiary} strokeWidth={2.5} />
                        <Text style={styles.statusTextLocked}>
                          {selectedBadge.progress !== null
                            ? `${selectedBadge.progress}/${selectedBadge.threshold}`
                            : 'LOCKED'}
                        </Text>
                      </>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  heroStats: {
    flex: 1,
  },
  heroNumber: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
  },
  heroLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  progressContainer: {
    gap: SPACING.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 4,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'right',
  },

  // Section
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: '31.5%',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  badgeCardEarned: {
    borderColor: COLORS.surface.borderAccent,
  },
  badgeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  badgeTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  badgeTitleEarned: {
    color: COLORS.text.primary,
  },
  badgeProgress: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 10,
  },
  tierPill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  tierText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Special Badges
  specialBadgesContainer: {
    gap: SPACING.sm,
  },
  specialBadgeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  specialBadgeCardEarned: {
    borderColor: COLORS.surface.borderAccent,
  },
  specialAccent: {
    width: 4,
  },
  specialContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  specialIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialInfo: {
    flex: 1,
  },
  specialTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  specialTitleEarned: {
    color: COLORS.text.primary,
  },
  specialDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  specialTierPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialProgress: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },

  // Modal
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    margin: SPACING.xl,
    alignItems: 'center',
    width: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    marginBottom: SPACING.lg,
  },
  modalIconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalTierPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.lg,
  },
  modalTierText: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
  },
  modalDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  statusPillUnlocked: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  statusPillLocked: {
    backgroundColor: COLORS.surface.card,
  },
  statusTextUnlocked: {
    ...TYPOGRAPHY.label,
    color: COLORS.success,
  },
  statusTextLocked: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
  },
});
