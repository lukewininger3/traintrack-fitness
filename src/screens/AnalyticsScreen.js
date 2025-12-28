import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable
} from 'react-native';
import { Calendar, TrendingUp, Dumbbell, Activity, Award, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react-native';
import { loadWorkouts } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function AnalyticsScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [timeFilter, setTimeFilter] = useState('month');
  const [consistencyStats, setConsistencyStats] = useState({
    daysThisMonth: 0,
    daysPassed: 0,
    daysLastMonth: 0,
    totalWorkoutsThisMonth: 0,
    totalWorkoutsLastMonth: 0
  });
  const [topExercises, setTopExercises] = useState([]);
  const [workoutTypeBreakdown, setWorkoutTypeBreakdown] = useState([]);
  const [strengthProgression, setStrengthProgression] = useState({
    topGainers: [],
    declining: []
  });

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (workouts.length > 0) {
      calculateStats(workouts);
    }
  }, [timeFilter, workouts]);

  const loadData = async () => {
    const data = await loadWorkouts();
    setWorkouts(data);
    calculateStats(data);
  };

  const calculateStats = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    const firstDayThisMonth = new Date(currentYear, currentMonth, 1);
    const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0);
    const lastMonthFirst = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthLast = new Date(currentYear, currentMonth, 0);
    
    const thisMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= firstDayThisMonth && workoutDate <= lastDayThisMonth;
    });
    
    const lastMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= lastMonthFirst && workoutDate <= lastMonthLast;
    });
    
    const lastMonthSameDayCount = lastMonthWorkouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate.getDate() <= currentDay;
    }).length;
    
    const uniqueDaysThisMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;
    
    setConsistencyStats({
      daysThisMonth: uniqueDaysThisMonth,
      daysPassed: currentDay,
      daysLastMonth: lastMonthSameDayCount,
      totalWorkoutsThisMonth: thisMonthWorkouts.length,
      totalWorkoutsLastMonth: lastMonthSameDayCount
    });
    
    const exerciseSets = {};
    const workoutsToAnalyze = timeFilter === 'month' ? thisMonthWorkouts : data;
    
    workoutsToAnalyze.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const setsCount = exercise.sets?.length || 0;
        exerciseSets[exercise.name] = (exerciseSets[exercise.name] || 0) + setsCount;
      });
    });
    
    const sortedExercises = Object.entries(exerciseSets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sets]) => ({ name, sets }));
    
    setTopExercises(sortedExercises);
    
    const typeCounts = {};
    thisMonthWorkouts.forEach(workout => {
      typeCounts[workout.type] = (typeCounts[workout.type] || 0) + 1;
    });
    
    const total = thisMonthWorkouts.length;
    const breakdown = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    setWorkoutTypeBreakdown(breakdown);
    
    calculateSessionProgression(data);
  };

  const calculateSessionProgression = (workouts) => {
    const sortedWorkouts = [...workouts].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    const exerciseChanges = [];
    
    sortedWorkouts.forEach((workout, workoutIdx) => {
      workout.exercises?.forEach(exercise => {
        const hasWeightReps = exercise.sets?.some(set => set.weight > 0 && set.reps > 0);
        if (!hasWeightReps) return;
        
        const currentMaxWeight = Math.max(...exercise.sets.map(set => set.weight || 0));
        
        for (let i = workoutIdx + 1; i < sortedWorkouts.length; i++) {
          const prevWorkout = sortedWorkouts[i];
          const prevExercise = prevWorkout.exercises?.find(e => e.name === exercise.name);
          
          if (prevExercise) {
            const prevSets = prevExercise.sets?.filter(s => s.weight > 0 && s.reps > 0);
            if (prevSets && prevSets.length > 0) {
              const prevMaxWeight = Math.max(...prevSets.map(set => set.weight || 0));
              
              if (prevMaxWeight > 0) {
                const percentChange = ((currentMaxWeight - prevMaxWeight) / prevMaxWeight) * 100;
                
                exerciseChanges.push({
                  name: exercise.name,
                  currentWeight: currentMaxWeight,
                  previousWeight: prevMaxWeight,
                  percentChange,
                  currentDate: workout.date,
                  previousDate: prevWorkout.date
                });
              }
              break;
            }
          }
        }
      });
    });
    
    const topGainers = exerciseChanges
      .filter(e => e.percentChange > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 3);
    
    const declining = exerciseChanges
      .filter(e => e.percentChange < 0)
      .sort((a, b) => a.percentChange - b.percentChange)
      .slice(0, 3);
    
    setStrengthProgression({
      topGainers,
      declining
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      'Strength': '#3B82F6',
      'Running': '#10B981',
      'Cycling': '#F59E0B',
      'Swimming': '#06B6D4',
      'Other': '#6B7280'
    };
    return colors[type] || '#6B7280';
  };

  const consistencyPercentage = consistencyStats.daysPassed > 0
    ? Math.round((consistencyStats.daysThisMonth / consistencyStats.daysPassed) * 100)
    : 0;

  const workoutChange = consistencyStats.totalWorkoutsThisMonth - consistencyStats.totalWorkoutsLastMonth;
  const isPositiveChange = workoutChange >= 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
        </View>

        {/* Recent Strength Changes - MOVED TO TOP */}
        {(strengthProgression.topGainers.length > 0 || strengthProgression.declining.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Dumbbell size={24} color="#8B5CF6" strokeWidth={2} />
              <Text style={styles.cardTitle}>Recent Strength Changes</Text>
            </View>
            <Text style={styles.cardSubtitle}>Session-to-session comparison</Text>

            {strengthProgression.topGainers.length > 0 && (
              <View style={styles.progressionSection}>
                <View style={styles.progressionHeader}>
                  <ArrowUp size={18} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.progressionTitle}>Recent Gains</Text>
                </View>
                {strengthProgression.topGainers.map((exercise, idx) => (
                  <View key={idx} style={styles.progressionRow}>
                    <View style={styles.progressionInfo}>
                      <Text style={styles.progressionName}>{exercise.name}</Text>
                      <Text style={styles.progressionDates}>
                        {exercise.previousDate} → {exercise.currentDate}
                      </Text>
                    </View>
                    <View style={styles.progressionStats}>
                      <Text style={styles.progressionWeight}>
                        {exercise.previousWeight} → {exercise.currentWeight} lbs
                      </Text>
                      <View style={[styles.progressionBadge, styles.progressionBadgePositive]}>
                        <Text style={styles.progressionBadgeText}>
                          +{exercise.percentChange.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {strengthProgression.declining.length > 0 && (
              <View style={styles.progressionSection}>
                <View style={styles.progressionHeader}>
                  <ArrowDown size={18} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.progressionTitle}>Recent Declines</Text>
                </View>
                {strengthProgression.declining.map((exercise, idx) => (
                  <View key={idx} style={styles.progressionRow}>
                    <View style={styles.progressionInfo}>
                      <Text style={styles.progressionName}>{exercise.name}</Text>
                      <Text style={styles.progressionDates}>
                        {exercise.previousDate} → {exercise.currentDate}
                      </Text>
                    </View>
                    <View style={styles.progressionStats}>
                      <Text style={styles.progressionWeight}>
                        {exercise.previousWeight} → {exercise.currentWeight} lbs
                      </Text>
                      <View style={[styles.progressionBadge, styles.progressionBadgeNegative]}>
                        <Text style={styles.progressionBadgeText}>
                          {exercise.percentChange.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Consistency Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={24} color="#FACC15" strokeWidth={2} />
            <Text style={styles.cardTitle}>Current Month Consistency</Text>
          </View>
          
          <View style={styles.consistencyContainer}>
            <View style={styles.ringContainer}>
              <View style={styles.ring}>
                <View style={[styles.ringFill, { 
                  width: `${consistencyPercentage}%`,
                  backgroundColor: consistencyPercentage >= 70 ? '#10B981' : 
                                   consistencyPercentage >= 40 ? '#F59E0B' : '#EF4444'
                }]} />
              </View>
              <View style={styles.ringCenter}>
                <Text style={styles.ringPercentage}>{consistencyPercentage}%</Text>
                <Text style={styles.ringLabel}>consistent</Text>
              </View>
            </View>
            
            <View style={styles.consistencyStats}>
              <View style={styles.consistencyStat}>
                <Text style={styles.consistencyNumber}>{consistencyStats.daysThisMonth}</Text>
                <Text style={styles.consistencyLabel}>Active Days</Text>
              </View>
              <View style={styles.consistencyDivider} />
              <View style={styles.consistencyStat}>
                <Text style={styles.consistencyNumber}>{consistencyStats.daysPassed}</Text>
                <Text style={styles.consistencyLabel}>Days Passed</Text>
              </View>
            </View>
          </View>

          <Text style={styles.consistencyNote}>
            {consistencyStats.daysThisMonth} of {consistencyStats.daysPassed} days active this month
          </Text>
        </View>

        {/* Comparison Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color="#3B82F6" strokeWidth={2} />
            <Text style={styles.cardTitle}>Same Period Last Month</Text>
          </View>
          
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>This Month</Text>
              <Text style={styles.comparisonValue}>{consistencyStats.totalWorkoutsThisMonth}</Text>
              <Text style={styles.comparisonSubtext}>workouts</Text>
            </View>
            
            <View style={styles.comparisonArrow}>
              <View style={[styles.changeIndicator, isPositiveChange ? styles.changePositive : styles.changeNegative]}>
                <Text style={[styles.changeText, !isPositiveChange && styles.changeTextNegative]}>
                  {isPositiveChange ? '+' : ''}{workoutChange}
                </Text>
              </View>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Last Month</Text>
              <Text style={styles.comparisonValue}>{consistencyStats.totalWorkoutsLastMonth}</Text>
              <Text style={styles.comparisonSubtext}>after {consistencyStats.daysPassed} days</Text>
            </View>
          </View>
        </View>

        {/* Top Exercises */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Dumbbell size={24} color="#8B5CF6" strokeWidth={2} />
            <Text style={styles.cardTitle}>Top Exercises</Text>
          </View>

          <View style={styles.filterContainer}>
            <Pressable
              style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('month')}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'month' && styles.filterButtonTextActive]}>
                This Month
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('all')}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'all' && styles.filterButtonTextActive]}>
                All Time
              </Text>
            </Pressable>
          </View>
          
          {topExercises.length > 0 ? (
            topExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <View style={styles.exerciseRank}>
                  <Text style={styles.exerciseRankText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCount}>{exercise.sets} sets</Text>
                </View>
                <View style={styles.exerciseBadge}>
                  {index === 0 && <Award size={20} color="#FACC15" fill="#FACC15" strokeWidth={2} />}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises recorded</Text>
            </View>
          )}
        </View>

        {/* Workout Type Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={24} color="#10B981" strokeWidth={2} />
            <Text style={styles.cardTitle}>Workout Type Breakdown</Text>
          </View>
          
          {workoutTypeBreakdown.length > 0 ? (
            <>
              {workoutTypeBreakdown.map((item, index) => (
                <View key={index} style={styles.typeRow}>
                  <View style={styles.typeInfo}>
                    <View style={[styles.typeDot, { backgroundColor: getTypeColor(item.type) }]} />
                    <Text style={styles.typeName}>{item.type}</Text>
                  </View>
                  <View style={styles.typeStats}>
                    <Text style={styles.typeCount}>{item.count}</Text>
                    <View style={styles.typeBarContainer}>
                      <View style={[styles.typeBar, { 
                        width: `${item.percentage}%`,
                        backgroundColor: getTypeColor(item.type)
                      }]} />
                    </View>
                    <Text style={styles.typePercentage}>{item.percentage}%</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts recorded this month</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>All-Time Stats</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{workouts.length}</Text>
              <Text style={styles.summaryLabel}>Total Workouts</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Exercises</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#9CA3AF' },
  card: { backgroundColor: '#374151', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 12 },
  cardSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: -12, marginBottom: 12 },
  consistencyContainer: { alignItems: 'center' },
  ringContainer: { width: 160, height: 160, marginBottom: 24 },
  ring: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#4B5563', overflow: 'hidden', position: 'relative' },
  ringFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 80 },
  ringCenter: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#374151', top: 20, left: 20, justifyContent: 'center', alignItems: 'center' },
  ringPercentage: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  ringLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  consistencyStats: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  consistencyStat: { alignItems: 'center', flex: 1 },
  consistencyNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  consistencyLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  consistencyDivider: { width: 1, height: 40, backgroundColor: '#4B5563' },
  consistencyNote: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
  comparisonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comparisonItem: { flex: 1, alignItems: 'center' },
  comparisonLabel: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  comparisonValue: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  comparisonSubtext: { fontSize: 12, color: '#9CA3AF' },
  comparisonArrow: { paddingHorizontal: 16 },
  changeIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changePositive: { backgroundColor: '#10B98120' },
  changeNegative: { backgroundColor: '#EF444420' },
  changeText: { fontSize: 16, fontWeight: '600', color: '#10B981' },
  changeTextNegative: { color: '#EF4444' },
  progressionSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#4B5563' },
  progressionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 8 },
  progressionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#4B5563', borderRadius: 8, padding: 12, marginBottom: 8 },
  progressionInfo: { flex: 1 },
  progressionName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  progressionDates: { fontSize: 11, color: '#9CA3AF' },
  progressionStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressionWeight: { fontSize: 12, color: '#9CA3AF' },
  progressionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  progressionBadgePositive: { backgroundColor: '#10B98120' },
  progressionBadgeNegative: { backgroundColor: '#EF444420' },
  progressionBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#4B5563', alignItems: 'center' },
  filterButtonActive: { backgroundColor: '#111827' },
  filterButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  filterButtonTextActive: { color: '#fff' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4B5563', borderRadius: 12, padding: 16, marginBottom: 8 },
  exerciseRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseRankText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  exerciseCount: { fontSize: 14, color: '#9CA3AF' },
  exerciseBadge: { width: 24, height: 24 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  typeName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  typeStats: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  typeCount: { fontSize: 16, fontWeight: '600', color: '#fff', marginRight: 12, minWidth: 30, textAlign: 'right' },
  typeBarContainer: { width: 60, height: 8, backgroundColor: '#4B5563', borderRadius: 4, marginRight: 12, overflow: 'hidden' },
  typeBar: { height: '100%', borderRadius: 4 },
  typePercentage: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', minWidth: 35 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  summaryCard: { backgroundColor: '#374151', borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
