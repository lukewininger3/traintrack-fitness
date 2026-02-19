import { ChevronDown, Search, TrendingUp, X, ArrowUp, ArrowDown, Zap, Dumbbell, Trophy, Weight } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { EXERCISE_DATABASE } from '../constants/workoutTypes';
import { loadWorkouts } from '../utils/storage';
import { calculateOneRepMax } from '../utils/personalRecords';
import { getCurrentWeekStats } from '../utils/weeklyRecap';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar } from 'lucide-react-native';
import BottomSheet from '../components/ui/BottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 300;

// Helper to format volume numbers (e.g., 12500 -> "12.5K")
const formatVolume = (volume) => {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
};

export default function ProgressScreen() {
  const { colors: themeColors } = useTheme();
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [isTouchingChart, setIsTouchingChart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('analytics'); // 'analytics' or 'charts'
  const [strengthProgression, setStrengthProgression] = useState({ topGainers: [], declining: [] });
  const [consistencyStats, setConsistencyStats] = useState({
    daysThisMonth: 0,
    daysPassed: 0,
    totalWorkoutsThisMonth: 0,
  });
  const [weeklyStats, setWeeklyStats] = useState(null);
  const scrollViewRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await loadWorkouts({ silent: true });
      setWorkouts(data || []);

      // Calculate consistency stats
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const dayOfMonth = now.getDate();

      const workoutsThisMonth = (data || []).filter(w => {
        const workoutDate = new Date(w.date);
        return workoutDate.getMonth() === currentMonth &&
               workoutDate.getFullYear() === currentYear;
      });

      // Count unique workout days this month
      const uniqueDays = new Set(workoutsThisMonth.map(w => {
        const d = new Date(w.date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }));

      setConsistencyStats({
        daysThisMonth: uniqueDays.size,
        daysPassed: dayOfMonth,
        totalWorkoutsThisMonth: workoutsThisMonth.length,
      });

      // Load weekly stats
      const weekStats = await getCurrentWeekStats();
      setWeeklyStats(weekStats);

      // Calculate strength progression
      calculateSessionProgression(data || []);

      const exerciseMap = {};
      (data || []).forEach(workout => {
        const exercises = workout?.exercises || [];
        exercises.forEach(exercise => {
          const sets = exercise?.sets || [];
          if (sets.length === 0) return;

          const maxSet = sets.reduce((max, set) =>
            (set?.weight || 0) > (max?.weight || 0) ? set : max, sets[0]
          );

          if (maxSet && maxSet.weight > 0) {
            if (!exerciseMap[exercise.name]) {
              exerciseMap[exercise.name] = [];
            }
            exerciseMap[exercise.name].push({
              date: workout.date,
              weight: maxSet.weight,
              reps: maxSet.reps || 0,
              workoutId: workout.id
            });
          }
        });
      });

      Object.keys(exerciseMap).forEach(exerciseName => {
        exerciseMap[exerciseName].sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        );
      });

      setExercises(exerciseMap);
    } catch (error) {
      console.error('Failed to load progress data:', error);
      setExercises({});
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSessionProgression = (workoutsData) => {
    const sortedWorkouts = [...workoutsData].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    const exerciseChanges = [];
    const seenExercises = new Set();

    sortedWorkouts.forEach((workout, workoutIdx) => {
      workout.exercises?.forEach(exercise => {
        if (seenExercises.has(exercise.name)) return;

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
                  percentChange
                });
                seenExercises.add(exercise.name);
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
      .slice(0, 5);

    const declining = exerciseChanges
      .filter(e => e.percentChange < 0)
      .sort((a, b) => a.percentChange - b.percentChange)
      .slice(0, 3);

    setStrengthProgression({ topGainers, declining });
  };

  const exerciseList = Object.keys(exercises).sort();

  const filteredExercises = useMemo(() => {
    let filtered = exerciseList;

    if (selectedCategory) {
      const categoryExercises = EXERCISE_DATABASE[selectedCategory] || [];
      filtered = filtered.filter(ex => categoryExercises.includes(ex));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [exerciseList, selectedCategory, searchQuery]);

  const availableCategories = useMemo(() => {
    // Only show categories that contain exercises the user has actually recorded
    const categories = new Set();
    exerciseList.forEach(exercise => {
      for (const [category, categoryExercises] of Object.entries(EXERCISE_DATABASE)) {
        if (categoryExercises.includes(exercise)) {
          categories.add(category);
          break;
        }
      }
    });
    return Array.from(categories).sort();
  }, [exerciseList]);

  const chartData = useMemo(() => {
    if (!selectedExercise || !exercises[selectedExercise]) {
      return [];
    }

    const records = exercises[selectedExercise];
    return records.map((record, index) => {
      const estimated1RM = calculateOneRepMax(record.weight, record.reps);
      return {
        x: index + 1,
        y: record.weight,
        date: record.date,
        reps: record.reps,
        weight: record.weight,
        estimated1RM,
      };
    });
  }, [selectedExercise, exercises]);

  const chartMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const pointRadius = 6;
    const padding = { top: 20, right: 40, bottom: 50, left: 50 };
    const chartWidth = CHART_WIDTH - padding.left - padding.right;
    const chartHeight = CHART_HEIGHT - padding.top - padding.bottom;

    const maxWeight = Math.max(...chartData.map(d => d.y));
    const minWeight = Math.min(...chartData.map(d => d.y));
    const actualRange = maxWeight - minWeight;

    const minRange = 10;
    const weightPadding = actualRange < minRange
      ? (minRange - actualRange) / 2 + 2
      : actualRange * 0.1;

    const availableWidth = chartWidth - (pointRadius * 2);
    const xScale = chartData.length === 1 ? 0 : availableWidth / Math.max(chartData.length - 1, 1);

    const adjustedMin = minWeight - weightPadding;
    const adjustedMax = maxWeight + weightPadding;
    const yScale = chartHeight / (adjustedMax - adjustedMin);

    return {
      padding,
      chartWidth,
      chartHeight,
      minWeight: adjustedMin,
      maxWeight: adjustedMax,
      actualRange,
      xScale,
      yScale,
      pointRadius
    };
  }, [chartData]);

  const svgPoints = useMemo(() => {
    if (!chartMetrics || chartData.length === 0) return [];

    return chartData.map((point, index) => {
      let x;
      if (chartData.length === 1) {
        x = chartMetrics.padding.left + chartMetrics.chartWidth / 2;
      } else {
        x = chartMetrics.padding.left + chartMetrics.pointRadius + (index * chartMetrics.xScale);
      }

      const y = chartMetrics.padding.top + chartMetrics.chartHeight -
                (point.y - chartMetrics.minWeight) * chartMetrics.yScale;
      return { ...point, svgX: x, svgY: y };
    });
  }, [chartData, chartMetrics]);

  const handlePointPress = (point, event) => {
    const { locationX, locationY } = event.nativeEvent;
    setTooltipData({
      x: point.x,
      y: point.y,
      weight: point.weight,
      reps: point.reps,
      estimated1RM: point.estimated1RM,
      date: point.date,
      svgX: point.svgX,
      svgY: point.svgY,
      screenX: locationX,
      screenY: locationY
    });
  };

  const findClosestPoint = (locationX, locationY) => {
    if (!chartMetrics || svgPoints.length === 0) return null;

    let closestPoint = null;
    let minDistance = Infinity;

    svgPoints.forEach(point => {
      const distance = Math.sqrt(
        Math.pow(locationX - point.svgX, 2) +
        Math.pow(locationY - point.svgY, 2)
      );
      if (distance < minDistance && distance < 50) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    return closestPoint;
  };

  const handleChartPressIn = (event) => {
    setIsTouchingChart(true);
    const { locationX, locationY } = event.nativeEvent;
    const closestPoint = findClosestPoint(locationX, locationY);

    if (closestPoint) {
      handlePointPress(closestPoint, { nativeEvent: { locationX, locationY } });
    }
  };

  const handleChartTouchMove = (event) => {
    if (!isTouchingChart) return;

    const { locationX, locationY } = event.nativeEvent;
    const closestPoint = findClosestPoint(locationX, locationY);

    if (closestPoint) {
      handlePointPress(closestPoint, { nativeEvent: { locationX, locationY } });
    }
  };

  const handleChartPressOut = () => {
    setIsTouchingChart(false);
    setTooltipData(null);
  };

  const handleExerciseSelect = (exerciseName) => {
    setSelectedExercise(exerciseName);
    setShowDropdown(false);
    setTooltipData(null);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background.primary }]}>
        <ActivityIndicator size="large" color={themeColors.accent.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text.tertiary }]}>Loading progress data...</Text>
      </View>
    );
  }

  // Analytics View
  const renderAnalyticsView = () => {
    const consistencyPercent = consistencyStats.daysPassed > 0
      ? Math.round((consistencyStats.daysThisMonth / consistencyStats.daysPassed) * 100)
      : 0;

    // Workout type breakdown
    const workoutTypes = weeklyStats?.workoutTypes || {};
    const workoutTypeEntries = Object.entries(workoutTypes).sort((a, b) => b[1] - a[1]);
    const totalWorkoutTypes = Object.values(workoutTypes).reduce((sum, count) => sum + count, 0);

    return (
    <View style={styles.analyticsContainer}>
      {/* Weekly Recap Card */}
      {weeklyStats && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <View style={styles.weeklyHeader}>
            <View style={styles.weeklyIconContainer}>
              <Zap size={16} color={themeColors.warning} strokeWidth={2.5} fill={themeColors.warning} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>WEEKLY RECAP</Text>
              <Text style={[styles.weeklySubtitle, { color: themeColors.text.tertiary }]}>{weeklyStats.weekLabel}</Text>
            </View>
          </View>

          {/* Stats Grid - 2x2 layout */}
          <View style={styles.weeklyStatsGrid}>
            <View style={styles.weeklyStatsRow}>
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: themeColors.text.primary }]}>{weeklyStats.totalWorkouts}</Text>
                <Text style={[styles.weeklyStatLabel, { color: themeColors.text.tertiary }]}>WORKOUTS</Text>
              </View>
              <View style={[styles.weeklyStatDivider, { backgroundColor: themeColors.surface.border }]} />
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: themeColors.text.primary }]}>{weeklyStats.daysActive}</Text>
                <Text style={[styles.weeklyStatLabel, { color: themeColors.text.tertiary }]}>DAYS ACTIVE</Text>
              </View>
            </View>
            <View style={[styles.weeklyStatsRowDivider, { backgroundColor: themeColors.surface.border }]} />
            <View style={styles.weeklyStatsRow}>
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: themeColors.text.primary }]}>
                  {formatVolume(weeklyStats.totalVolume || 0)}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: themeColors.text.tertiary }]}>VOLUME (LBS)</Text>
              </View>
              <View style={[styles.weeklyStatDivider, { backgroundColor: themeColors.surface.border }]} />
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: themeColors.text.primary }, weeklyStats.prsCount > 0 && { color: themeColors.warning }]}>
                  {weeklyStats.prsCount}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: themeColors.text.tertiary }]}>PRs HIT</Text>
              </View>
            </View>
          </View>

          {/* Workout Type Breakdown - Pie Chart */}
          {totalWorkoutTypes > 0 && (
            <View style={[styles.exerciseTypeSection, { backgroundColor: themeColors.background.elevated }]}>
              <Text style={[styles.exerciseTypeTitle, { color: themeColors.text.tertiary }]}>WORKOUT BREAKDOWN</Text>
              <View style={styles.pieChartContainer}>
                <Svg width={100} height={100} viewBox="0 0 100 100">
                  {(() => {
                    const cx = 50, cy = 50, radius = 40;
                    let currentAngle = -90; // Start at top
                    return workoutTypeEntries.map(([type, count], idx) => {
                      const percentage = count / totalWorkoutTypes;
                      const angle = percentage * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      currentAngle = endAngle;

                      // Convert to radians
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;

                      // Calculate arc points
                      const x1 = cx + radius * Math.cos(startRad);
                      const y1 = cy + radius * Math.sin(startRad);
                      const x2 = cx + radius * Math.cos(endRad);
                      const y2 = cy + radius * Math.sin(endRad);

                      const largeArc = angle > 180 ? 1 : 0;

                      // If only one type, draw a full circle
                      if (workoutTypeEntries.length === 1) {
                        return (
                          <Circle
                            key={type}
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill={themeColors.workoutTypes[type] || themeColors.text.tertiary}
                          />
                        );
                      }

                      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      return (
                        <Path
                          key={type}
                          d={d}
                          fill={themeColors.workoutTypes[type] || themeColors.text.tertiary}
                        />
                      );
                    });
                  })()}
                </Svg>
                <View style={styles.pieChartLegend}>
                  {workoutTypeEntries.map(([type, count]) => (
                    <View key={type} style={styles.pieChartLegendItem}>
                      <View style={[styles.exerciseTypeDot, { backgroundColor: themeColors.workoutTypes[type] || themeColors.text.tertiary }]} />
                      <Text style={[styles.pieChartLegendText, { color: themeColors.text.secondary }]}>{type}</Text>
                      <Text style={[styles.pieChartLegendCount, { color: themeColors.text.primary }]}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Consistency Stats Card */}
      <Animated.View entering={FadeIn.duration(300)} style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
        <View style={styles.consistencyHeader}>
          <Calendar size={18} color={themeColors.accent.primary} strokeWidth={2.5} />
          <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>MONTHLY CONSISTENCY</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: themeColors.text.tertiary }]}>Active days this month so far</Text>

        <View style={styles.consistencyContent}>
          <View style={styles.consistencyMain}>
            <Text style={[styles.consistencyPercent, { color: themeColors.accent.primary }]}>{consistencyPercent}%</Text>
            <Text style={[styles.consistencyLabel, { color: themeColors.text.tertiary }]}>of days active</Text>
          </View>
          <View style={[styles.consistencyDivider, { backgroundColor: themeColors.surface.border }]} />
          <View style={styles.consistencyDetail}>
            <View style={styles.consistencyRow}>
              <Text style={[styles.consistencyDetailLabel, { color: themeColors.text.tertiary }]}>Active days</Text>
              <Text style={[styles.consistencyDetailValue, { color: themeColors.text.primary }]}>{consistencyStats.daysThisMonth}</Text>
            </View>
            <View style={styles.consistencyRow}>
              <Text style={[styles.consistencyDetailLabel, { color: themeColors.text.tertiary }]}>Days passed</Text>
              <Text style={[styles.consistencyDetailValue, { color: themeColors.text.primary }]}>{consistencyStats.daysPassed}</Text>
            </View>
            <View style={styles.consistencyRow}>
              <Text style={[styles.consistencyDetailLabel, { color: themeColors.text.tertiary }]}>Total workouts</Text>
              <Text style={[styles.consistencyDetailValue, { color: themeColors.text.primary }]}>{consistencyStats.totalWorkoutsThisMonth}</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: themeColors.surface.border }]}>
            <View style={[styles.progressBarFill, { width: `${Math.min(consistencyPercent, 100)}%`, backgroundColor: themeColors.accent.primary }]} />
          </View>
        </View>
      </Animated.View>

      {/* Strength Gains Card */}
      {strengthProgression.topGainers.length > 0 && (
        <Animated.View entering={FadeIn.duration(300).delay(100)} style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>STRENGTH GAINS</Text>
          <Text style={[styles.cardSubtitle, { color: themeColors.text.tertiary }]}>Recent weight increases</Text>

          <View style={styles.gainsList}>
            {strengthProgression.topGainers.map((exercise, idx) => (
              <View key={idx} style={[styles.gainRow, { backgroundColor: themeColors.background.elevated }]}>
                <View style={styles.gainInfo}>
                  <Text style={[styles.gainName, { color: themeColors.text.primary }]} numberOfLines={1}>{exercise.name}</Text>
                  <Text style={[styles.gainWeight, { color: themeColors.text.tertiary }]}>
                    {exercise.previousWeight} → {exercise.currentWeight} lbs
                  </Text>
                </View>
                <View style={styles.gainBadge}>
                  <ArrowUp size={12} color={themeColors.success} strokeWidth={3} />
                  <Text style={[styles.gainPercent, { color: themeColors.success }]}>+{exercise.percentChange.toFixed(0)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Declining Exercises Card */}
      {strengthProgression.declining.length > 0 && (
        <Animated.View entering={FadeIn.duration(300).delay(200)} style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>NEEDS ATTENTION</Text>
          <Text style={[styles.cardSubtitle, { color: themeColors.text.tertiary }]}>Weight decreases to monitor</Text>

          <View style={styles.gainsList}>
            {strengthProgression.declining.map((exercise, idx) => (
              <View key={idx} style={[styles.gainRow, { backgroundColor: themeColors.background.elevated }]}>
                <View style={styles.gainInfo}>
                  <Text style={[styles.gainName, { color: themeColors.text.primary }]} numberOfLines={1}>{exercise.name}</Text>
                  <Text style={[styles.gainWeight, { color: themeColors.text.tertiary }]}>
                    {exercise.previousWeight} → {exercise.currentWeight} lbs
                  </Text>
                </View>
                <View style={[styles.gainBadge, styles.declineBadge]}>
                  <ArrowDown size={12} color={themeColors.error} strokeWidth={3} />
                  <Text style={[styles.gainPercent, { color: themeColors.error }]}>
                    {exercise.percentChange.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Empty state for analytics */}
      {strengthProgression.topGainers.length === 0 && consistencyStats.totalWorkoutsThisMonth === 0 && (
        <View style={styles.emptyAnalytics}>
          <TrendingUp size={48} color={themeColors.text.tertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text.secondary }]}>NO DATA YET</Text>
          <Text style={[styles.emptyText, { color: themeColors.text.tertiary }]}>Complete workouts to see your analytics</Text>
        </View>
      )}
    </View>
    );
  };

  // Charts View
  const renderChartsView = () => (
    <>
      {exerciseList.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.surface.card }]}>
            <TrendingUp size={48} color={themeColors.text.tertiary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text.secondary }]}>NO EXERCISE DATA</Text>
          <Text style={[styles.emptyText, { color: themeColors.text.tertiary }]}>Complete workouts to track your progress</Text>
        </View>
      ) : (
        <>
          {/* Exercise Dropdown */}
          <View style={styles.dropdownContainer}>
            <Text style={[styles.label, { color: themeColors.text.secondary }]}>SELECT EXERCISE</Text>
            <Pressable
              style={[styles.dropdown, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
              onPress={() => setShowDropdown(true)}
            >
              <Text style={[
                styles.dropdownText,
                { color: themeColors.text.primary },
                !selectedExercise && { color: themeColors.text.tertiary }
              ]}>
                {selectedExercise || 'Tap to select an exercise'}
              </Text>
              <View style={[styles.dropdownIcon, { backgroundColor: themeColors.accent.primaryDim }]}>
                <ChevronDown size={20} color={themeColors.accent.primary} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>

          {/* Chart or Prompt */}
          {!selectedExercise ? (
            <View style={[styles.promptContainer, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              <View style={[styles.promptIconContainer, { backgroundColor: themeColors.accent.primaryDim }]}>
                <TrendingUp size={48} color={themeColors.accent.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.promptTitle, { color: themeColors.text.primary }]}>SELECT AN EXERCISE</Text>
              <Text style={[styles.promptText, { color: themeColors.text.secondary }]}>
                Choose an exercise from the dropdown above to view your weight progression over time
              </Text>
            </View>
          ) : selectedExercise && exercises[selectedExercise] && exercises[selectedExercise].length > 0 ? (
            <View style={[styles.chartCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: themeColors.text.primary }]}>{selectedExercise}</Text>
                  <Text style={[styles.chartSubtitle, { color: themeColors.text.tertiary }]}>Weight Progression</Text>
                </View>
                <View style={[styles.chartBadge, { backgroundColor: themeColors.accent.primaryDim }]}>
                  <Text style={[styles.chartBadgeText, { color: themeColors.accent.primary }]}>{svgPoints.length} sessions</Text>
                </View>
              </View>

              <View
                style={[styles.chartWrapper, { backgroundColor: themeColors.background.primary }]}
                onStartShouldSetResponder={() => {
                  setIsTouchingChart(true);
                  return true;
                }}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleChartPressIn}
                onResponderMove={handleChartTouchMove}
                onResponderRelease={handleChartPressOut}
                onResponderTerminate={handleChartPressOut}
                onResponderTerminationRequest={() => false}
              >
                {chartMetrics && svgPoints.length > 0 && (
                  <>
                    <Svg width={CHART_WIDTH} height={CHART_HEIGHT} pointerEvents="none">
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => {
                        const y = chartMetrics.padding.top +
                                 (chartMetrics.chartHeight / 4) * i;
                        return (
                          <Line
                            key={`grid-h-${i}`}
                            x1={chartMetrics.padding.left}
                            y1={y}
                            x2={chartMetrics.padding.left + chartMetrics.chartWidth}
                            y2={y}
                            stroke={themeColors.surface.border}
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                        );
                      })}

                      {/* Y-axis labels */}
                      {(() => {
                        const range = chartMetrics.maxWeight - chartMetrics.minWeight;
                        const labelCount = range < 10 ? 3 : 5;
                        const labelIndices = labelCount === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4];

                        return labelIndices.map(i => {
                          const weight = chartMetrics.minWeight +
                                       (chartMetrics.maxWeight - chartMetrics.minWeight) * (1 - i / 4);
                          const y = chartMetrics.padding.top + (chartMetrics.chartHeight / 4) * i;

                          const displayWeight = range < 5
                            ? weight.toFixed(1)
                            : Math.round(weight).toString();

                          return (
                            <G key={`y-label-${i}`}>
                              <SvgText
                                x={chartMetrics.padding.left - 10}
                                y={y + 4}
                                fontSize="11"
                                fill={themeColors.text.tertiary}
                                textAnchor="end"
                                fontWeight="600"
                              >
                                {displayWeight}
                              </SvgText>
                            </G>
                          );
                        });
                      })()}

                      {/* Y-axis title */}
                      <SvgText
                        x={15}
                        y={CHART_HEIGHT / 2}
                        fontSize="10"
                        fill={themeColors.text.tertiary}
                        textAnchor="middle"
                        transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
                        fontWeight="600"
                      >
                        WEIGHT (LBS)
                      </SvgText>

                      {/* X-axis labels */}
                      {svgPoints.map((point, index) => {
                        const showLabel = index % Math.ceil(svgPoints.length / 5) === 0 ||
                                        index === svgPoints.length - 1 ||
                                        index === 0;
                        if (showLabel) {
                          const date = new Date(point.date);
                          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                          return (
                            <SvgText
                              key={`x-label-${index}`}
                              x={point.svgX}
                              y={CHART_HEIGHT - chartMetrics.padding.bottom + 20}
                              fontSize="10"
                              fill={themeColors.text.tertiary}
                              textAnchor="middle"
                              fontWeight="600"
                            >
                              {dateStr}
                            </SvgText>
                          );
                        }
                        return null;
                      })}

                      {/* Line */}
                      {svgPoints.length > 1 && (
                        <Polyline
                          points={svgPoints.map(p => `${p.svgX},${p.svgY}`).join(' ')}
                          fill="none"
                          stroke={themeColors.accent.primary}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data points */}
                      {svgPoints.map((point, index) => (
                        <Circle
                          key={`point-${index}`}
                          cx={point.svgX}
                          cy={point.svgY}
                          r="7"
                          fill={themeColors.accent.primary}
                          stroke={themeColors.background.primary}
                          strokeWidth="2"
                        />
                      ))}

                      {/* Axes */}
                      <Line
                        x1={chartMetrics.padding.left}
                        y1={chartMetrics.padding.top}
                        x2={chartMetrics.padding.left}
                        y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                        stroke={themeColors.surface.border}
                        strokeWidth="2"
                      />
                      <Line
                        x1={chartMetrics.padding.left}
                        y1={chartMetrics.padding.top + chartMetrics.chartHeight}
                        x2={chartMetrics.padding.left + chartMetrics.chartWidth}
                        y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                        stroke={themeColors.surface.border}
                        strokeWidth="2"
                      />
                    </Svg>

                    {/* Tooltip */}
                    {tooltipData && tooltipData.svgX !== undefined && (
                      <View
                        style={[
                          styles.tooltip,
                          {
                            position: 'absolute',
                            left: Math.max(10, Math.min(tooltipData.svgX - 70, CHART_WIDTH - 150)),
                            top: tooltipData.svgY - 80,
                            backgroundColor: themeColors.background.secondary,
                            borderColor: themeColors.accent.primary,
                          }
                        ]}
                      >
                        <Text style={[styles.tooltipDate, { color: themeColors.accent.primary }]}>
                          {new Date(tooltipData.date).toLocaleDateString()}
                        </Text>
                        <View style={styles.tooltipRow}>
                          <Text style={[styles.tooltipLabel, { color: themeColors.text.tertiary }]}>Weight</Text>
                          <Text style={[styles.tooltipValueHighlight, { color: themeColors.accent.primary }]}>{tooltipData.weight} lbs</Text>
                        </View>
                        <View style={styles.tooltipRow}>
                          <Text style={[styles.tooltipLabel, { color: themeColors.text.tertiary }]}>Reps</Text>
                          <Text style={[styles.tooltipValueHighlight, { color: themeColors.accent.primary }]}>{tooltipData.reps}</Text>
                        </View>
                        {tooltipData.estimated1RM > 0 && (
                          <View style={styles.tooltipRow}>
                            <Text style={[styles.tooltipLabel, { color: themeColors.text.tertiary }]}>Est. 1RM</Text>
                            <Text style={[styles.tooltipValueHighlight, { color: themeColors.accent.primary }]}>{tooltipData.estimated1RM} lbs</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>

              <Text style={[styles.hintText, { color: themeColors.text.tertiary }]}>Touch chart to see details</Text>
            </View>
          ) : selectedExercise ? (
            <View style={[styles.emptyChart, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              <View style={[styles.emptyChartIcon, { backgroundColor: themeColors.background.elevated }]}>
                <TrendingUp size={40} color={themeColors.text.tertiary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyChartTitle, { color: themeColors.text.secondary }]}>NO DATA YET</Text>
              <Text style={[styles.emptyChartText, { color: themeColors.text.tertiary }]}>
                No sets recorded for {selectedExercise}
              </Text>
              <Text style={[styles.emptyChartSubtext, { color: themeColors.text.tertiary }]}>
                Complete a workout with this exercise to track progress
              </Text>
            </View>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      {/* View Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: themeColors.background.primary }]}>
        <View style={[styles.toggleWrapper, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Pressable
            style={[
              styles.toggleButton,
              activeView === 'analytics' && { backgroundColor: themeColors.accent.primary }
            ]}
            onPress={() => setActiveView('analytics')}
          >
            <Text style={[
              styles.toggleText,
              { color: themeColors.text.tertiary },
              activeView === 'analytics' && { color: themeColors.text.inverse }
            ]}>
              Analytics
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              activeView === 'charts' && { backgroundColor: themeColors.accent.primary }
            ]}
            onPress={() => setActiveView('charts')}
          >
            <Text style={[
              styles.toggleText,
              { color: themeColors.text.tertiary },
              activeView === 'charts' && { color: themeColors.text.inverse }
            ]}>
              Charts
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        scrollEnabled={!isTouchingChart}
        nestedScrollEnabled={false}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {activeView === 'analytics' ? renderAnalyticsView() : renderChartsView()}
        </View>
      </ScrollView>

      {/* Exercise Picker Bottom Sheet */}
      <BottomSheet
        isVisible={showDropdown}
        onClose={() => {
          setShowDropdown(false);
          setSearchQuery('');
          setSelectedCategory(null);
        }}
        height="75%"
        scrollable={false}
      >
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.surface.border }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>SELECT EXERCISE</Text>
          <Pressable
            onPress={() => {
              setShowDropdown(false);
              setSearchQuery('');
              setSelectedCategory(null);
            }}
            style={[styles.modalCloseButton, { backgroundColor: themeColors.surface.card }]}
          >
            <X size={20} color={themeColors.text.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]}>
          <Search size={18} color={themeColors.text.tertiary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text.primary }]}
            placeholder="Search exercises..."
            placeholderTextColor={themeColors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={16} color={themeColors.text.tertiary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                style={[
                  styles.categoryChip,
                  { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                  selectedCategory === null && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.categoryChipText,
                  { color: themeColors.text.secondary },
                  selectedCategory === null && { color: themeColors.accent.primary }
                ]}>
                  All
                </Text>
              </Pressable>
              {availableCategories.map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
                    selectedCategory === category && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: themeColors.text.secondary },
                    selectedCategory === category && { color: themeColors.accent.primary }
                  ]}>
                    {category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          {filteredExercises.length > 0 ? (
            filteredExercises.map((exerciseName) => (
              <Pressable
                key={exerciseName}
                style={[
                  styles.modalItem,
                  { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
                  selectedExercise === exerciseName && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent }
                ]}
                onPress={() => handleExerciseSelect(exerciseName)}
              >
                <Text style={[
                  styles.modalItemText,
                  { color: themeColors.text.primary },
                  selectedExercise === exerciseName && { color: themeColors.accent.primary }
                ]}>
                  {exerciseName}
                </Text>
                {selectedExercise === exerciseName && (
                  <View style={[styles.selectedIndicator, { backgroundColor: themeColors.accent.primary }]} />
                )}
              </Pressable>
            ))
          ) : (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: themeColors.text.tertiary }]}>No exercises found</Text>
            </View>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Toggle
  toggleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.primary,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.accent.primary,
  },
  toggleText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  toggleTextActive: {
    color: COLORS.text.inverse,
  },

  // Analytics View
  analyticsContainer: {
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  cardTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
  },

  // Weekly Recap Card
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  weeklyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklySubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },
  weeklyStatsGrid: {
    marginBottom: SPACING.lg,
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyStatsRowDivider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
    marginVertical: SPACING.md,
  },
  weeklyStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  weeklyStatValue: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
    fontSize: 28,
  },
  weeklyStatLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  weeklyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.surface.border,
  },
  exerciseTypeSection: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  exerciseTypeTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  exerciseTypeBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  exerciseTypeCompound: {
    backgroundColor: COLORS.accent.primary,
  },
  exerciseTypeIsolation: {
    backgroundColor: COLORS.tertiary.primary,
  },
  exerciseTypeLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  workoutTypeLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  pieChartLegend: {
    flex: 1,
    gap: SPACING.xs,
  },
  pieChartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pieChartLegendText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    color: COLORS.text.secondary,
  },
  pieChartLegendCount: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  exerciseTypeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exerciseTypeLegendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.secondary,
  },

  // Consistency Card
  consistencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  consistencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consistencyMain: {
    alignItems: 'center',
    paddingRight: SPACING.lg,
  },
  consistencyPercent: {
    ...TYPOGRAPHY.h1,
    fontSize: 48,
    color: COLORS.accent.primary,
    lineHeight: 52,
  },
  consistencyLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  consistencyDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.md,
  },
  consistencyDetail: {
    flex: 1,
    gap: SPACING.sm,
  },
  consistencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consistencyDetailLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  consistencyDetailValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  progressBarContainer: {
    marginTop: SPACING.lg,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLORS.surface.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 3,
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
  gainName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  gainWeight: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  declineBadge: {
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
  },
  gainPercent: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.success,
  },
  declinePercent: {
    color: COLORS.error,
  },
  emptyAnalytics: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Dropdown
  dropdownContainer: {
    marginBottom: SPACING.xl,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  dropdownText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  dropdownIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Prompt
  promptContainer: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  promptTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  promptText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Chart Card
  chartCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  chartSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  chartBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chartBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  chartModeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  chartModeButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  chartModeButtonActive: {
    backgroundColor: COLORS.accent.primary,
  },
  chartModeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  chartModeTextActive: {
    color: COLORS.text.inverse,
  },
  chartWrapper: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  hintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // Tooltip
  tooltip: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent.primary,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  tooltipDate: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent.primary,
    marginBottom: SPACING.sm,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tooltipLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  tooltipValue: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  tooltipValueHighlight: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },

  // Empty Chart
  emptyChart: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyChartTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  emptyChartText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  emptyChartSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Exercise Picker Sheet
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  clearButton: {
    padding: SPACING.xs,
  },

  // Categories
  categoryContainer: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  categoryChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  categoryChipTextActive: {
    color: COLORS.accent.primary,
  },

  // Modal List
  modalList: {
    paddingHorizontal: SPACING.lg,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  modalItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  modalItemTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent.primary,
  },
  noResults: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noResultsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
});
