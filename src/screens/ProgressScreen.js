import { ChevronDown, Search, TrendingUp, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { EXERCISE_DATABASE } from '../constants/workoutTypes';
import { loadWorkouts } from '../utils/storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 300;

export default function ProgressScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [isTouchingChart, setIsTouchingChart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts();
    setWorkouts(data);

    const exerciseMap = {};
    data.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const maxSet = exercise.sets.reduce((max, set) =>
          set.weight > max.weight ? set : max, exercise.sets[0]
        );

        if (maxSet.weight > 0) {
          if (!exerciseMap[exercise.name]) {
            exerciseMap[exercise.name] = [];
          }
          exerciseMap[exercise.name].push({
            date: workout.date,
            weight: maxSet.weight,
            reps: maxSet.reps,
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
    const categories = new Set();
    exerciseList.forEach(exercise => {
      Object.keys(EXERCISE_DATABASE).forEach(category => {
        if (EXERCISE_DATABASE[category].includes(exercise)) {
          categories.add(category);
        }
      });
    });
    return Array.from(categories).sort();
  }, [exerciseList]);

  const chartData = useMemo(() => {
    if (!selectedExercise || !exercises[selectedExercise]) {
      return [];
    }

    const records = exercises[selectedExercise];
    return records.map((record, index) => ({
      x: index + 1,
      y: record.weight,
      date: record.date,
      reps: record.reps,
      weight: record.weight
    }));
  }, [selectedExercise, exercises]);

  const chartMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const pointRadius = 6;
    const padding = { top: 20, right: 40, bottom: 50, left: 50 };
    const chartWidth = CHART_WIDTH - padding.left - padding.right;
    const chartHeight = CHART_HEIGHT - padding.top - padding.bottom;

    const maxWeight = Math.max(...chartData.map(d => d.y));
    const minWeight = Math.min(...chartData.map(d => d.y));
    const weightRange = maxWeight - minWeight || 1;
    const weightPadding = weightRange * 0.1;

    const availableWidth = CHART_WIDTH - padding.left - padding.right - (pointRadius * 2);
    const xScale = chartData.length === 1 ? 0 : availableWidth / Math.max(chartData.length - 1, 1);
    const yScale = chartHeight / (maxWeight - minWeight + weightPadding * 2);

    return {
      padding,
      chartWidth,
      chartHeight,
      minWeight: minWeight - weightPadding,
      maxWeight: maxWeight + weightPadding,
      xScale,
      yScale,
      pointRadius
    };
  }, [chartData]);

  const svgPoints = useMemo(() => {
    if (!chartMetrics || chartData.length === 0) return [];

    return chartData.map((point, index) => {
      const x = chartData.length === 1
        ? chartMetrics.padding.left + (CHART_WIDTH - chartMetrics.padding.left - chartMetrics.padding.right) / 2
        : chartMetrics.padding.left + chartMetrics.pointRadius + (point.x - 1) * chartMetrics.xScale;
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

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        scrollEnabled={!isTouchingChart}
        nestedScrollEnabled={false}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {exerciseList.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <TrendingUp size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>NO EXERCISE DATA</Text>
              <Text style={styles.emptyText}>Complete workouts to track your progress</Text>
            </View>
          ) : (
            <>
              {/* Exercise Dropdown */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>SELECT EXERCISE</Text>
                <Pressable
                  style={styles.dropdown}
                  onPress={() => setShowDropdown(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !selectedExercise && styles.dropdownPlaceholder
                  ]}>
                    {selectedExercise || 'Tap to select an exercise'}
                  </Text>
                  <View style={styles.dropdownIcon}>
                    <ChevronDown size={20} color={COLORS.accent.primary} strokeWidth={2.5} />
                  </View>
                </Pressable>
              </View>

              {/* Chart or Prompt */}
              {!selectedExercise ? (
                <View style={styles.promptContainer}>
                  <View style={styles.promptIconContainer}>
                    <TrendingUp size={48} color={COLORS.accent.primary} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.promptTitle}>SELECT AN EXERCISE</Text>
                  <Text style={styles.promptText}>
                    Choose an exercise from the dropdown above to view your weight progression over time
                  </Text>
                </View>
              ) : selectedExercise && exercises[selectedExercise] && exercises[selectedExercise].length > 0 ? (
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View>
                      <Text style={styles.chartTitle}>{selectedExercise}</Text>
                      <Text style={styles.chartSubtitle}>Weight Progression</Text>
                    </View>
                    <View style={styles.chartBadge}>
                      <Text style={styles.chartBadgeText}>{svgPoints.length} sessions</Text>
                    </View>
                  </View>

                  <View
                    style={styles.chartWrapper}
                    onStartShouldSetResponder={() => {
                      setIsTouchingChart(true);
                      if (scrollViewRef.current) {
                        scrollViewRef.current.setNativeProps({ scrollEnabled: false });
                      }
                      return true;
                    }}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={handleChartPressIn}
                    onResponderMove={handleChartTouchMove}
                    onResponderRelease={() => {
                      handleChartPressOut();
                      if (scrollViewRef.current) {
                        scrollViewRef.current.setNativeProps({ scrollEnabled: true });
                      }
                    }}
                    onResponderTerminate={() => {
                      handleChartPressOut();
                      if (scrollViewRef.current) {
                        scrollViewRef.current.setNativeProps({ scrollEnabled: true });
                      }
                    }}
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
                                stroke={COLORS.surface.border}
                                strokeWidth="1"
                                strokeDasharray="4,4"
                              />
                            );
                          })}

                          {/* Y-axis labels */}
                          {[0, 1, 2, 3, 4].map(i => {
                            const weight = chartMetrics.minWeight +
                                         (chartMetrics.maxWeight - chartMetrics.minWeight) * (1 - i / 4);
                            const y = chartMetrics.padding.top + (chartMetrics.chartHeight / 4) * i;
                            return (
                              <G key={`y-label-${i}`}>
                                <SvgText
                                  x={chartMetrics.padding.left - 10}
                                  y={y + 4}
                                  fontSize="11"
                                  fill={COLORS.text.tertiary}
                                  textAnchor="end"
                                  fontWeight="600"
                                >
                                  {Math.round(weight)}
                                </SvgText>
                              </G>
                            );
                          })}

                          {/* Y-axis title */}
                          <SvgText
                            x={15}
                            y={CHART_HEIGHT / 2}
                            fontSize="10"
                            fill={COLORS.text.tertiary}
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
                                  fill={COLORS.text.tertiary}
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
                              stroke={COLORS.accent.primary}
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
                              fill={COLORS.accent.primary}
                              stroke={COLORS.background.primary}
                              strokeWidth="2"
                            />
                          ))}

                          {/* Axes */}
                          <Line
                            x1={chartMetrics.padding.left}
                            y1={chartMetrics.padding.top}
                            x2={chartMetrics.padding.left}
                            y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                            stroke={COLORS.surface.border}
                            strokeWidth="2"
                          />
                          <Line
                            x1={chartMetrics.padding.left}
                            y1={chartMetrics.padding.top + chartMetrics.chartHeight}
                            x2={chartMetrics.padding.left + chartMetrics.chartWidth}
                            y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                            stroke={COLORS.surface.border}
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
                                top: tooltipData.svgY - 85,
                              }
                            ]}
                          >
                            <Text style={styles.tooltipDate}>
                              {new Date(tooltipData.date).toLocaleDateString()}
                            </Text>
                            <View style={styles.tooltipRow}>
                              <Text style={styles.tooltipLabel}>Weight</Text>
                              <Text style={styles.tooltipValue}>{tooltipData.weight} lbs</Text>
                            </View>
                            <View style={styles.tooltipRow}>
                              <Text style={styles.tooltipLabel}>Reps</Text>
                              <Text style={styles.tooltipValue}>{tooltipData.reps}</Text>
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  <Text style={styles.hintText}>Touch chart to see details</Text>
                </View>
              ) : selectedExercise ? (
                <View style={styles.emptyChart}>
                  <View style={styles.emptyChartIcon}>
                    <TrendingUp size={40} color={COLORS.text.tertiary} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.emptyChartTitle}>NO DATA YET</Text>
                  <Text style={styles.emptyChartText}>
                    No sets recorded for {selectedExercise}
                  </Text>
                  <Text style={styles.emptyChartSubtext}>
                    Complete a workout with this exercise to track progress
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT EXERCISE</Text>
              <Pressable
                onPress={() => {
                  setShowDropdown(false);
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} color={COLORS.text.primary} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <X size={16} color={COLORS.text.tertiary} strokeWidth={2} />
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
                      selectedCategory === null && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === null && styles.categoryChipTextActive
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextActive
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
                      selectedExercise === exerciseName && styles.modalItemSelected
                    ]}
                    onPress={() => handleExerciseSelect(exerciseName)}
                  >
                    <Text style={[
                      styles.modalItemText,
                      selectedExercise === exerciseName && styles.modalItemTextSelected
                    ]}>
                      {exerciseName}
                    </Text>
                    {selectedExercise === exerciseName && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </Pressable>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No exercises found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  chartWrapper: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    position: 'relative',
    overflow: 'visible',
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '75%',
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
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
