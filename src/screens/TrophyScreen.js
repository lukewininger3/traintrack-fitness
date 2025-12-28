import { useFocusEffect } from '@react-navigation/native';
import { Award, Trophy, Flame, Target, Activity, Zap, Star, Crown, Gem, Calendar, TrendingUp, Medal, Flag, Sparkles, Heart } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated
} from 'react-native';
import { loadWorkouts } from '../utils/storage';

export default function TrophyScreen() {
  const [badges, setBadges] = useState({
    totalWorkouts: 0,
    consecutiveWeeks: 0,
    mambaMentality: false,
    blackMamba: false,
    triathlete: false,
    multiWorkoutDays: 0
  });

  const [flippedBadges, setFlippedBadges] = useState(new Set());

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

  const toggleBadge = (badgeId) => {
    setFlippedBadges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(badgeId)) {
        newSet.delete(badgeId);
      } else {
        newSet.add(badgeId);
      }
      return newSet;
    });
  };

  const workoutBadges = [
    { id: 'w1', threshold: 1, title: 'First Step', description: 'Complete your first workout', Icon: Target, color: '#10B981' },
    { id: 'w10', threshold: 10, title: 'Getting Started', description: '10 workouts completed', Icon: Activity, color: '#3B82F6' },
    { id: 'w50', threshold: 50, title: 'Committed', description: '50 workouts completed', Icon: Flame, color: '#F59E0B' },
    { id: 'w100', threshold: 100, title: 'Century', description: '100 workouts completed', Icon: Medal, color: '#8B5CF6' },
    { id: 'w500', threshold: 500, title: 'Elite', description: '500 workouts completed', Icon: Zap, color: '#EC4899' },
    { id: 'w1000', threshold: 1000, title: 'Legend', description: '1000 workouts completed', Icon: Crown, color: '#FACC15' }
  ];

  const consistencyBadges = [
    { id: 'c4', weeks: 4, title: '1 Month Streak', description: '4 consecutive weeks', Icon: Calendar, color: '#10B981' },
    { id: 'c26', weeks: 26, title: '6 Month Streak', description: '26 consecutive weeks', Icon: Flame, color: '#3B82F6' },
    { id: 'c52', weeks: 52, title: '1 Year Streak', description: '52 consecutive weeks', Icon: Trophy, color: '#F59E0B' },
    { id: 'c104', weeks: 104, title: '2 Year Streak', description: '104 consecutive weeks', Icon: Star, color: '#8B5CF6' },
    { id: 'c156', weeks: 156, title: '3 Year Streak', description: '156 consecutive weeks', Icon: Gem, color: '#EC4899' },
    { id: 'c208', weeks: 208, title: '4 Year Streak', description: '208 consecutive weeks', Icon: Award, color: '#EF4444' },
    { id: 'c260', weeks: 260, title: '5 Year Streak', description: '260 consecutive weeks', Icon: Sparkles, color: '#FACC15' }
  ];

  const specialBadges = [
    {
      id: 'mamba',
      title: 'Mamba Mentality',
      description: 'Complete 2+ workouts in a single day',
      Icon: Zap,
      color: '#8B5CF6',
      earned: badges.mambaMentality,
      progress: badges.multiWorkoutDays >= 1 ? 1 : 0,
      total: 1
    },
    {
      id: 'blackMamba',
      title: 'Black Mamba',
      description: 'Complete 2+ workouts in a day for 50 days total',
      Icon: Flame,
      color: '#1F2937',
      earned: badges.blackMamba,
      progress: badges.multiWorkoutDays,
      total: 50
    },
    {
      id: 'triathlete',
      title: 'Triathlete',
      description: 'Complete Run, Bike, and Swim workouts',
      Icon: TrendingUp,
      color: '#06B6D4',
      earned: badges.triathlete,
      progress: null,
      total: null
    }
  ];

  const renderBadge = (badge, earned, progress = null) => {
    const isFlipped = flippedBadges.has(badge.id);
    const Icon = badge.Icon;

    return (
      <Pressable
        key={badge.id}
        onPress={() => toggleBadge(badge.id)}
        style={[
          styles.badge,
          earned && styles.badgeEarned,
          { borderColor: earned ? badge.color : '#4B5563' }
        ]}
      >
        {!isFlipped ? (
          // Front: Icon + Title
          <>
            <View style={[styles.badgeIcon, earned && { backgroundColor: badge.color + '20' }]}>
              <Icon size={32} color={earned ? badge.color : '#6B7280'} strokeWidth={2.5} />
            </View>
            <Text style={[styles.badgeTitle, earned && styles.badgeTitleEarned]}>
              {badge.title}
            </Text>
            {progress !== null && !earned && (
              <Text style={styles.badgeProgress}>
                {progress}/{badge.total || badge.threshold || badge.weeks}
              </Text>
            )}
            {earned && (
              <Trophy size={16} color={badge.color} strokeWidth={2.5} fill={badge.color} />
            )}
          </>
        ) : (
          // Back: Description
          <View style={styles.badgeDescription}>
            <Text style={[styles.badgeDescriptionText, earned && { color: '#fff' }]}>
              {badge.description}
            </Text>
            {progress !== null && (
              <Text style={[styles.badgeProgressDetail, earned && { color: badge.color }]}>
                {earned ? '✓ Completed' : `${progress}/${badge.total || badge.threshold || badge.weeks}`}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  const renderSpecialBadge = (badge) => {
    const isFlipped = flippedBadges.has(badge.id);
    const Icon = badge.Icon;

    return (
      <Pressable
        key={badge.id}
        onPress={() => toggleBadge(badge.id)}
        style={[
          styles.specialBadge,
          badge.earned && styles.specialBadgeEarned,
          { borderColor: badge.earned ? badge.color : '#4B5563' }
        ]}
      >
        {!isFlipped ? (
          // Front
          <>
            <View style={[styles.specialBadgeIcon, badge.earned && { backgroundColor: badge.color + '20' }]}>
              <Icon size={40} color={badge.earned ? badge.color : '#6B7280'} strokeWidth={2.5} />
            </View>
            <View style={styles.specialBadgeInfo}>
              <Text style={[styles.specialBadgeTitle, badge.earned && styles.specialBadgeTitleEarned]}>
                {badge.title}
              </Text>
              {badge.progress !== null && !badge.earned && (
                <Text style={styles.specialBadgeProgress}>
                  Progress: {badge.progress}/{badge.total}
                </Text>
              )}
            </View>
            {badge.earned && (
              <View style={styles.specialBadgeCheck}>
                <Trophy size={24} color={badge.color} strokeWidth={2.5} fill={badge.color} />
              </View>
            )}
          </>
        ) : (
          // Back
          <View style={styles.specialBadgeDescriptionContainer}>
            <Text style={[styles.specialBadgeDescription, badge.earned && { color: '#fff' }]}>
              {badge.description}
            </Text>
            {badge.progress !== null && (
              <Text style={[styles.specialBadgeProgressDetail, badge.earned && { color: badge.color }]}>
                {badge.earned ? '✓ Achievement Unlocked' : `Progress: ${badge.progress}/${badge.total}`}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Trophy size={32} color="#FACC15" strokeWidth={2.5} />
          <Text style={styles.headerTitle}>Trophy Case</Text>
          <Text style={styles.headerSubtitle}>Tap badges to view details</Text>
        </View>

        {/* Total Workouts Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Milestones</Text>
          <View style={styles.badgeGrid}>
            {workoutBadges.map(badge => 
              renderBadge(
                badge, 
                badges.totalWorkouts >= badge.threshold,
                badges.totalWorkouts
              )
            )}
          </View>
        </View>

        {/* Consistency Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consistency Streaks</Text>
          <View style={styles.badgeGrid}>
            {consistencyBadges.map(badge => 
              renderBadge(
                badge, 
                badges.consecutiveWeeks >= badge.weeks,
                badges.consecutiveWeeks
              )
            )}
          </View>
        </View>

        {/* Special Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Achievements</Text>
          <View style={styles.specialBadgesContainer}>
            {specialBadges.map(badge => renderSpecialBadge(badge))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#374151',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEarned: {
    backgroundColor: '#1F293740',
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTitleEarned: {
    color: '#fff',
  },
  badgeProgress: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeDescription: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  badgeDescriptionText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeProgressDetail: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '600',
  },
  specialBadgesContainer: {
    gap: 12,
  },
  specialBadge: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
  },
  specialBadgeEarned: {
    backgroundColor: '#1F293740',
  },
  specialBadgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  specialBadgeInfo: {
    flex: 1,
  },
  specialBadgeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  specialBadgeTitleEarned: {
    color: '#fff',
  },
  specialBadgeProgress: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  specialBadgeCheck: {
    marginLeft: 12,
  },
  specialBadgeDescriptionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  specialBadgeDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  specialBadgeProgressDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '600',
  },
});
