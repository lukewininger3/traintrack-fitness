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
  CheckCircle,
  Heart,
  ListChecks,
  CircleCheck
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
import { loadAllWeeklyGoals } from '../utils/goalsStorage';
import { loadWeightData, getConsecutiveDaysLogged } from '../utils/weightStorage';
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Tier colors work well in both light and dark mode
const TIER_COLORS = {
  bronze: { primary: '#CD7F32', dim: 'rgba(205, 127, 50, 0.15)' },
  silver: { primary: '#A8A29E', dim: 'rgba(168, 162, 158, 0.15)' },
  gold: { primary: '#D4AF37', dim: 'rgba(212, 175, 55, 0.15)' },
  platinum: { primary: '#8B9A7B', dim: 'rgba(139, 154, 123, 0.15)' },
  diamond: { primary: '#B9F2FF', dim: 'rgba(185, 242, 255, 0.15)' }
};

export default function TrophyScreen() {
  const { colors: themeColors } = useTheme();
  const [badges, setBadges] = useState({
    totalWorkouts: 0,
    consecutiveWeeks: 0,
    mambaMentality: false,
    blackMamba: false,
    triathlete: false,
    multiWorkoutDays: 0,
    // Goal achievements
    goalsCompleted: 0,
    perfectWeeks: 0,
    consecutivePerfectWeeks: 0,
    // Weight achievements
    consecutiveWeightDays: 0,
    weightGoalsReached: 0,
    // Planning achievements
    plannedWorkoutsCreated: 0,
    plannedWorkoutsCompleted: 0
  });

  const [selectedBadge, setSelectedBadge] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const workouts = await loadWorkouts();
    const allGoals = await loadAllWeeklyGoals();
    const weightData = await loadWeightData();
    const consecutiveWeightDays = await getConsecutiveDaysLogged();
    calculateBadges(workouts, allGoals, weightData, consecutiveWeightDays);
  };

  const calculateBadges = (workouts, allGoals = [], weightData = {}, consecutiveWeightDays = 0) => {
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

    // Calculate goal achievements
    let goalsCompleted = 0;
    let perfectWeeks = 0;
    let plannedWorkoutsCreated = 0;
    let plannedWorkoutsCompleted = 0;

    allGoals.forEach(weekData => {
      // Count individual goals completed
      if (weekData.goals) {
        goalsCompleted += weekData.goals.filter(g => g.completed).length;
      }
      // Check if all goals were completed for this week
      if (weekData.goals && weekData.goals.length > 0 && weekData.goals.every(g => g.completed)) {
        perfectWeeks++;
      }
      // Count planned workouts
      if (weekData.plannedWorkouts) {
        plannedWorkoutsCreated += weekData.plannedWorkouts.filter(p => p.workoutType).length;
        plannedWorkoutsCompleted += weekData.plannedWorkouts.filter(p => p.completed).length;
      }
    });

    // Calculate consecutive perfect weeks
    const consecutivePerfectWeeks = calculateConsecutivePerfectWeeks(allGoals);

    // Calculate weight achievements
    const weightGoalsReached = weightData.goalsReachedHistory?.length || 0;

    setBadges({
      totalWorkouts,
      consecutiveWeeks,
      mambaMentality,
      blackMamba,
      triathlete,
      multiWorkoutDays,
      // Goal achievements
      goalsCompleted,
      perfectWeeks,
      consecutivePerfectWeeks,
      // Weight achievements
      consecutiveWeightDays,
      weightGoalsReached,
      // Planning achievements
      plannedWorkoutsCreated,
      plannedWorkoutsCompleted
    });
  };

  const calculateConsecutivePerfectWeeks = (allGoals) => {
    if (!allGoals || allGoals.length === 0) return 0;

    // Sort by week start date descending
    const sorted = [...allGoals]
      .filter(w => w.goals && w.goals.length > 0)
      .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));

    let consecutive = 0;
    let currentWeekStart = new Date();
    // Get the current week's Monday
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    for (const weekData of sorted) {
      const weekStart = new Date(weekData.weekStart);
      weekStart.setHours(0, 0, 0, 0);

      // Check if this is the expected week
      const expectedWeek = new Date(currentWeekStart);
      expectedWeek.setDate(expectedWeek.getDate() - (consecutive * 7));

      const timeDiff = Math.abs(weekStart - expectedWeek);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff <= 1 && weekData.goals.every(g => g.completed)) {
        consecutive++;
      } else if (daysDiff > 7) {
        break;
      }
    }

    return consecutive;
  };

  const calculateConsecutiveWeeks = (workouts) => {
    if (workouts.length === 0) return 0;

    const weekSet = new Set();
    workouts.forEach(w => {
      // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
      const date = new Date(w.date + 'T12:00:00');
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

  // Goal achievement badges
  const goalBadges = [
    {
      id: 'goalGetter',
      title: 'Goal Getter',
      description: 'Complete your first weekly goal',
      Icon: Target,
      tier: 'bronze',
      earned: badges.goalsCompleted >= 1,
      progress: badges.goalsCompleted,
      total: 1
    },
    {
      id: 'goalCrusher',
      title: 'Goal Crusher',
      description: 'Complete all goals in a single week',
      Icon: CircleCheck,
      tier: 'silver',
      earned: badges.perfectWeeks >= 1,
      progress: badges.perfectWeeks,
      total: 1
    },
    {
      id: 'consistencyKing',
      title: 'Consistency King',
      description: 'Perfect weeks for 4 weeks straight',
      Icon: Crown,
      tier: 'gold',
      earned: badges.consecutivePerfectWeeks >= 4,
      progress: badges.consecutivePerfectWeeks,
      total: 4
    },
    {
      id: 'goalMaster',
      title: 'Goal Master',
      description: 'Perfect weeks for 12 weeks straight',
      Icon: Gem,
      tier: 'platinum',
      earned: badges.consecutivePerfectWeeks >= 12,
      progress: badges.consecutivePerfectWeeks,
      total: 12
    }
  ];

  // Weight tracking badges
  const weightBadges = [
    {
      id: 'weightWatcher',
      title: 'Weight Watcher',
      description: 'Log weight for 7 consecutive days',
      Icon: Heart,
      tier: 'bronze',
      earned: badges.consecutiveWeightDays >= 7,
      progress: badges.consecutiveWeightDays,
      total: 7
    },
    {
      id: 'transformation',
      title: 'Transformation',
      description: 'Reach a weight goal',
      Icon: Medal,
      tier: 'gold',
      earned: badges.weightGoalsReached >= 1,
      progress: badges.weightGoalsReached,
      total: 1
    },
    {
      id: 'bodyRecomp',
      title: 'Body Recomp',
      description: 'Reach 3 different weight goals',
      Icon: Star,
      tier: 'platinum',
      earned: badges.weightGoalsReached >= 3,
      progress: badges.weightGoalsReached,
      total: 3
    }
  ];

  // Planning badges
  const planningBadges = [
    {
      id: 'planner',
      title: 'Planner',
      description: 'Create your first weekly plan',
      Icon: ListChecks,
      tier: 'bronze',
      earned: badges.plannedWorkoutsCreated >= 1,
      progress: badges.plannedWorkoutsCreated,
      total: 1
    },
    {
      id: 'organized',
      title: 'Organized',
      description: 'Complete 10 planned workouts',
      Icon: Activity,
      tier: 'silver',
      earned: badges.plannedWorkoutsCompleted >= 10,
      progress: badges.plannedWorkoutsCompleted,
      total: 10
    },
    {
      id: 'masterPlanner',
      title: 'Master Planner',
      description: 'Complete 50 planned workouts',
      Icon: Award,
      tier: 'gold',
      earned: badges.plannedWorkoutsCompleted >= 50,
      progress: badges.plannedWorkoutsCompleted,
      total: 50
    }
  ];

  // Calculate unlocked counts
  const unlockedWorkout = workoutBadges.filter(b => badges.totalWorkouts >= b.threshold).length;
  const unlockedConsistency = consistencyBadges.filter(b => badges.consecutiveWeeks >= b.weeks).length;
  const unlockedSpecial = specialBadges.filter(b => b.earned).length;
  const unlockedGoal = goalBadges.filter(b => b.earned).length;
  const unlockedWeight = weightBadges.filter(b => b.earned).length;
  const unlockedPlanning = planningBadges.filter(b => b.earned).length;
  const totalUnlocked = unlockedWorkout + unlockedConsistency + unlockedSpecial + unlockedGoal + unlockedWeight + unlockedPlanning;
  const totalBadges = workoutBadges.length + consistencyBadges.length + specialBadges.length + goalBadges.length + weightBadges.length + planningBadges.length;

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
        style={[
          styles.badgeCard,
          { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
          earned && { borderColor: themeColors.surface.borderAccent }
        ]}
      >
        <Animated.View style={[
          styles.badgeIconContainer,
          { backgroundColor: earned ? tierColor.dim : themeColors.background.elevated },
          earned && { shadowColor: tierColor.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }
        ]}>
          {earned ? (
            <Icon size={28} color={tierColor.primary} strokeWidth={2.5} />
          ) : (
            <Lock size={22} color={themeColors.text.tertiary} strokeWidth={2} />
          )}
        </Animated.View>
        <Text style={[styles.badgeTitle, { color: themeColors.text.tertiary }, earned && { color: themeColors.text.primary }]} numberOfLines={1}>
          {badge.title}
        </Text>
        {earned ? (
          <View style={[styles.tierPill, { backgroundColor: tierColor.dim }]}>
            <Text style={[styles.tierText, { color: tierColor.primary }]}>
              {badge.tier.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Text style={[styles.badgeProgress, { color: themeColors.text.tertiary }]}>
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
        style={[
          styles.specialBadgeCard,
          { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
          badge.earned && { borderColor: themeColors.surface.borderAccent }
        ]}
      >
        <View style={[styles.specialAccent, { backgroundColor: badge.earned ? tierColor.primary : themeColors.surface.border }]} />
        <View style={styles.specialContent}>
          <Animated.View style={[
            styles.specialIconContainer,
            { backgroundColor: badge.earned ? tierColor.dim : themeColors.background.elevated },
            badge.earned && { shadowColor: tierColor.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 }
          ]}>
            {badge.earned ? (
              <Icon size={32} color={tierColor.primary} strokeWidth={2.5} />
            ) : (
              <Lock size={24} color={themeColors.text.tertiary} strokeWidth={2} />
            )}
          </Animated.View>
          <View style={styles.specialInfo}>
            <Text style={[styles.specialTitle, { color: themeColors.text.tertiary }, badge.earned && { color: themeColors.text.primary }]}>
              {badge.title}
            </Text>
            <Text style={[styles.specialDescription, { color: themeColors.text.tertiary }]}>{badge.description}</Text>
          </View>
          {badge.earned ? (
            <View style={[styles.specialTierPill, { backgroundColor: tierColor.dim }]}>
              <Trophy size={14} color={tierColor.primary} fill={tierColor.primary} strokeWidth={2} />
            </View>
          ) : badge.progress !== null && (
            <Text style={[styles.specialProgress, { color: themeColors.text.tertiary }]}>{badge.progress}/{badge.total}</Text>
          )}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background.primary }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Hero Stats */}
        <Animated.View
          entering={FadeIn.delay(100).springify()}
          style={[styles.heroCard, { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }]}
        >
          <View style={styles.heroTop}>
            <Animated.View
              entering={FadeInDown.delay(200).springify().damping(12)}
              style={[styles.heroIconContainer, { backgroundColor: themeColors.background.primary }]}
            >
              <Crown size={36} color={themeColors.accent.primary} fill={themeColors.accent.primary} strokeWidth={2} />
            </Animated.View>
            <View style={styles.heroStats}>
              <Text style={[styles.heroNumber, { color: themeColors.text.primary }]}>{totalUnlocked}</Text>
              <Text style={[styles.heroLabel, { color: themeColors.text.secondary }]}>/ {totalBadges} BADGES</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: themeColors.background.primary }]}>
              <Animated.View
                entering={FadeIn.delay(400)}
                style={[styles.progressFill, { width: `${(totalUnlocked / totalBadges) * 100}%`, backgroundColor: themeColors.accent.primary }]}
              />
            </View>
            <Text style={[styles.progressText, { color: themeColors.text.secondary }]}>
              {Math.round((totalUnlocked / totalBadges) * 100)}% Complete
            </Text>
          </View>
        </Animated.View>

        {/* Workout Milestones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={18} color={themeColors.accent.primary} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>WORKOUT MILESTONES</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedWorkout}/{workoutBadges.length}</Text>
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
            <Flame size={18} color={themeColors.secondary.primary} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>CONSISTENCY STREAKS</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedConsistency}/{consistencyBadges.length}</Text>
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
            <Sparkles size={18} color={themeColors.tertiary.primary} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>SPECIAL ACHIEVEMENTS</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedSpecial}/{specialBadges.length}</Text>
            </View>
          </View>
          <View style={styles.specialBadgesContainer}>
            {specialBadges.map((badge, index) => renderSpecialBadge(badge, index))}
          </View>
        </View>

        {/* Weekly Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={themeColors.success} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>WEEKLY GOALS</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedGoal}/{goalBadges.length}</Text>
            </View>
          </View>
          <View style={styles.specialBadgesContainer}>
            {goalBadges.map((badge, index) => renderSpecialBadge(badge, index))}
          </View>
        </View>

        {/* Weight Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={18} color={themeColors.accent.primary} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>WEIGHT PROGRESS</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedWeight}/{weightBadges.length}</Text>
            </View>
          </View>
          <View style={styles.specialBadgesContainer}>
            {weightBadges.map((badge, index) => renderSpecialBadge(badge, index))}
          </View>
        </View>

        {/* Planning */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ListChecks size={18} color={themeColors.secondary.primary} strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>PLANNING</Text>
            <View style={[styles.countBadge, { backgroundColor: themeColors.surface.card }]}>
              <Text style={[styles.countText, { color: themeColors.text.tertiary }]}>{unlockedPlanning}/{planningBadges.length}</Text>
            </View>
          </View>
          <View style={styles.specialBadgesContainer}>
            {planningBadges.map((badge, index) => renderSpecialBadge(badge, index))}
          </View>
        </View>
      </View>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <View style={styles.modal}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: themeColors.overlay.heavy }]} onPress={() => setSelectedBadge(null)} />
          <View style={[styles.modalContent, { backgroundColor: themeColors.background.secondary }]}>
            <View style={[styles.modalHandle, { backgroundColor: themeColors.surface.border }]} />

            {(() => {
              const tierColor = TIER_COLORS[selectedBadge.tier];
              const Icon = selectedBadge.Icon;
              return (
                <>
                  <View style={[
                    styles.modalIconContainer,
                    { backgroundColor: selectedBadge.earned ? tierColor.dim : themeColors.surface.card }
                  ]}>
                    {selectedBadge.earned ? (
                      <Icon size={56} color={tierColor.primary} strokeWidth={2} />
                    ) : (
                      <Lock size={48} color={themeColors.text.tertiary} strokeWidth={2} />
                    )}
                  </View>

                  <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>{selectedBadge.title}</Text>

                  <View style={[
                    styles.modalTierPill,
                    { backgroundColor: selectedBadge.earned ? tierColor.dim : themeColors.surface.card }
                  ]}>
                    <Text style={[
                      styles.modalTierText,
                      { color: selectedBadge.earned ? tierColor.primary : themeColors.text.tertiary }
                    ]}>
                      {selectedBadge.tier.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.modalDescription, { color: themeColors.text.secondary }]}>{selectedBadge.description}</Text>

                  <View style={[
                    styles.statusPill,
                    selectedBadge.earned
                      ? { backgroundColor: themeColors.successDim }
                      : { backgroundColor: themeColors.surface.card }
                  ]}>
                    {selectedBadge.earned ? (
                      <>
                        <CheckCircle size={18} color={themeColors.success} strokeWidth={2.5} />
                        <Text style={[styles.statusTextUnlocked, { color: themeColors.success }]}>UNLOCKED</Text>
                      </>
                    ) : (
                      <>
                        <Lock size={18} color={themeColors.text.tertiary} strokeWidth={2.5} />
                        <Text style={[styles.statusTextLocked, { color: themeColors.text.tertiary }]}>
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
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  heroStats: {
    flex: 1,
  },
  heroNumber: {
    ...TYPOGRAPHY.stat,
  },
  heroLabel: {
    ...TYPOGRAPHY.label,
    marginTop: SPACING.xs,
  },
  progressContainer: {
    gap: SPACING.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
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
    flex: 1,
  },
  countBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: '31.5%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  badgeProgress: {
    ...TYPOGRAPHY.caption,
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
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
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
    marginBottom: 2,
  },
  specialDescription: {
    ...TYPOGRAPHY.caption,
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
  },
  modalContent: {
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
  statusTextUnlocked: {
    ...TYPOGRAPHY.label,
  },
  statusTextLocked: {
    ...TYPOGRAPHY.label,
  },
});
