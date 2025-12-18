import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Calendar, TrendingUp, Dumbbell, Activity, Award } from 'lucide-react-native';
import { loadWorkouts } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    currentMonth: 0,
    lastMonth: 0,
    daysThisMonth: 0,
    totalDaysInMonth: 30
  });
  const [topExercises, setTopExercises] = useState([]);
  const [workoutTypeBreakdown, setWorkoutTypeBreakdown] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await loadWorkouts();
    setWorkouts(data);
    calculateStats(data);
  };

  const calculateStats = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    
    // Get first and last day of last month
    const lastMonthFirst = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthLast = new Date(currentYear, currentMonth, 0);
    
    // Filter workouts by month
    const thisMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= firstDay && workoutDate <= lastDay;
    });
    
    const lastMonthWorkouts = data.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= lastMonthFirst && workoutDate <= lastMonthLast;
    });
    
    // Count unique days with workouts this month
    const uniqueDaysThisMonth = new Set(
      thisMonthWorkouts.map(w => w.date)
    ).size;
    
    setMonthlyStats({
      currentMonth: thisMonthWorkouts.length,
      lastMonth: lastMonthWorkouts.length,
      daysThisMonth: uniqueDaysThisMonth,
      totalDaysInMonth: totalDaysInMonth
    });
    
    // Calculate top exercises (from this month)
    const exerciseCounts = {};
    thisMonthWorkouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1;
      });
    });
    
    const sortedExercises = Object.entries(exerciseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    setTopExercises(sortedExercises);
    
    // Calculate workout type breakdown (this month)
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

  const consistencyPercentage = monthlyStats.totalDaysInMonth > 0
    ? Math.round((monthlyStats.daysThisMonth / monthlyStats.totalDaysInMonth) * 100)
    : 0;

  const monthChange = monthlyStats.currentMonth - monthlyStats.lastMonth;
  const isPositiveChange = monthChange >= 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
        </View>

        {/* Monthly Consistency Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={24} color="#FACC15" strokeWidth={2} />
            <Text style={styles.cardTitle}>Monthly Consistency</Text>
          </View>
          
          <View style={styles.consistencyContainer}>
            {/* Progress Ring */}
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
                <Text style={styles.ringLabel}>consistency</Text>
              </View>
            </View>
            
            <View style={styles.consistencyStats}>
              <View style={styles.consistencyStat}>
                <Text style={styles.consistencyNumber}>{monthlyStats.daysThisMonth}</Text>
                <Text style={styles.consistencyLabel}>Days Active</Text>
              </View>
              <View style={styles.consistencyDivider} />
              <View style={styles.consistencyStat}>
                <Text style={styles.consistencyNumber}>{monthlyStats.totalDaysInMonth - monthlyStats.daysThisMonth}</Text>
                <Text style={styles.consistencyLabel}>Days Left</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workout Count Comparison */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color="#3B82F6" strokeWidth={2} />
            <Text style={styles.cardTitle}>This Month vs Last Month</Text>
          </View>
          
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>This Month</Text>
              <Text style={styles.comparisonValue}>{monthlyStats.currentMonth}</Text>
              <Text style={styles.comparisonSubtext}>workouts</Text>
            </View>
            
            <View style={styles.comparisonArrow}>
              <View style={[styles.changeIndicator, isPositiveChange ? styles.changePositive : styles.changeNegative]}>
                <Text style={styles.changeText}>
                  {isPositiveChange ? '+' : ''}{monthChange}
                </Text>
              </View>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Last Month</Text>
              <Text style={styles.comparisonValue}>{monthlyStats.lastMonth}</Text>
              <Text style={styles.comparisonSubtext}>workouts</Text>
            </View>
          </View>
        </View>

        {/* Top Exercises */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Dumbbell size={24} color="#8B5CF6" strokeWidth={2} />
            <Text style={styles.cardTitle}>Top Exercises This Month</Text>
          </View>
          
          {topExercises.length > 0 ? (
            topExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <View style={styles.exerciseRank}>
                  <Text style={styles.exerciseRankText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCount}>{exercise.count} times</Text>
                </View>
                <View style={styles.exerciseBadge}>
                  {index === 0 && <Award size={20} color="#FACC15" fill="#FACC15" strokeWidth={2} />}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises recorded this month</Text>
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

        {/* Overall Stats Summary */}
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
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  consistencyContainer: {
    alignItems: 'center',
  },
  ringContainer: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#4B5563',
    overflow: 'hidden',
    position: 'relative',
  },
  ringFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 80,
  },
  ringCenter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    top: 20,
    left: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  ringLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  consistencyStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  consistencyStat: {
    alignItems: 'center',
    flex: 1,
  },
  consistencyNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  consistencyLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  consistencyDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#4B5563',
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  comparisonSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  comparisonArrow: {
    paddingHorizontal: 16,
  },
  changeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePositive: {
    backgroundColor: '#10B98120',
  },
  changeNegative: {
    backgroundColor: '#EF444420',
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  exerciseRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  exerciseBadge: {
    width: 24,
    height: 24,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  typeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  typeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
    minWidth: 30,
    textAlign: 'right',
  },
  typeBarContainer: {
    width: 60,
    height: 8,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  typeBar: {
    height: '100%',
    borderRadius: 4,
  },
  typePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    minWidth: 35,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
