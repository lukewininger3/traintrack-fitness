import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Trophy, Star, Award, Crown } from 'lucide-react-native';
import { loadWorkouts } from '../utils/storage';

const TITLES = [
  { name: 'Beginner', minDays: 0, icon: 'star' },
  { name: 'Novice', minDays: 5, icon: 'star' },
  { name: 'Intermediate', minDays: 10, icon: 'award' },
  { name: 'Advanced', minDays: 20, icon: 'trophy' },
  { name: 'Expert', minDays: 30, icon: 'crown' },
  { name: 'Master', minDays: 50, icon: 'crown' },
];

export default function TrophyScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [workoutDays, setWorkoutDays] = useState(0);
  const [currentTitle, setCurrentTitle] = useState(TITLES[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts();
    setWorkouts(data);
    const uniqueDays = new Set(data.map(w => w.date)).size;
    setWorkoutDays(uniqueDays);
    
    // Find current title
    for (let i = TITLES.length - 1; i >= 0; i--) {
      if (uniqueDays >= TITLES[i].minDays) {
        setCurrentTitle(TITLES[i]);
        break;
      }
    }
  };

  const getIcon = (iconName) => {
    const icons = {
      'star': Star,
      'award': Award,
      'trophy': Trophy,
      'crown': Crown
    };
    return icons[iconName] || Star;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Current Title */}
        <View style={styles.currentTitleCard}>
          <View style={styles.currentIconContainer}>
            {React.createElement(getIcon(currentTitle.icon), {
              size: 64,
              color: '#FACC15',
              strokeWidth: 2
            })}
          </View>
          <Text style={styles.currentTitleText}>{currentTitle.name}</Text>
          <Text style={styles.currentTitleSubtext}>Current Title</Text>
          <Text style={styles.workoutDaysText}>{workoutDays} workout days</Text>
        </View>

        {/* All Titles */}
        <Text style={styles.sectionHeader}>All Titles</Text>
        {TITLES.map((title, idx) => {
          const Icon = getIcon(title.icon);
          const isUnlocked = workoutDays >= title.minDays;
          const isCurrent = title.name === currentTitle.name;
          
          return (
            <View
              key={idx}
              style={[
                styles.titleCard,
                isCurrent && styles.titleCardCurrent
              ]}
            >
              <View style={[
                styles.iconContainer,
                !isUnlocked && styles.iconContainerLocked
              ]}>
                <Icon
                  size={32}
                  color={isUnlocked ? '#FACC15' : '#4B5563'}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.titleInfo}>
                <Text style={[
                  styles.titleName,
                  !isUnlocked && styles.titleNameLocked
                ]}>
                  {title.name}
                </Text>
                <Text style={styles.titleRequirement}>
                  {isUnlocked 
                    ? `Unlocked at ${title.minDays} days`
                    : `Requires ${title.minDays} workout days`}
                </Text>
              </View>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </View>
          );
        })}
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
  },
  currentTitleCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  currentIconContainer: {
    marginBottom: 16,
  },
  currentTitleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  currentTitleSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  workoutDaysText: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  titleCardCurrent: {
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerLocked: {
    opacity: 0.5,
  },
  titleInfo: {
    flex: 1,
  },
  titleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  titleNameLocked: {
    color: '#9CA3AF',
  },
  titleRequirement: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  currentBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
