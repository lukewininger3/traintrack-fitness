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
    
    // Build exercise map with highest weight set for each workout
    // Only include exercises that have weight data (not cardio)
    const exerciseMap = {};
    data.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        // Find the set with the highest weight
        const maxSet = exercise.sets.reduce((max, set) => 
          set.weight > max.weight ? set : max, exercise.sets[0]
        );
        
        // Only include exercises with weight > 0 (strength exercises)
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
    
    // Sort each exercise's records by date
    Object.keys(exerciseMap).forEach(exerciseName => {
      exerciseMap[exerciseName].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
    });
    
    setExercises(exerciseMap);
  };

  const exerciseList = Object.keys(exercises).sort();

  // Filter exercises based on search and category
  const filteredExercises = useMemo(() => {
    let filtered = exerciseList;
    
    // Filter by category
    if (selectedCategory) {
      const categoryExercises = EXERCISE_DATABASE[selectedCategory] || [];
      filtered = filtered.filter(ex => categoryExercises.includes(ex));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [exerciseList, selectedCategory, searchQuery]);

  // Get all available categories from exercises
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

  // Prepare chart data for selected exercise
  const chartData = useMemo(() => {
    if (!selectedExercise || !exercises[selectedExercise]) {
      return [];
    }
    
    const records = exercises[selectedExercise];
    return records.map((record, index) => ({
      x: index + 1, // Use index as x-axis (session number)
      y: record.weight,
      date: record.date,
      reps: record.reps,
      weight: record.weight
    }));
  }, [selectedExercise, exercises]);

  // Calculate chart dimensions and scales
  const chartMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const pointRadius = 6; // Circle radius for data points
    const padding = { top: 20, right: 40, bottom: 50, left: 50 }; // Increased right/bottom padding for dates
    const chartWidth = CHART_WIDTH - padding.left - padding.right;
    const chartHeight = CHART_HEIGHT - padding.top - padding.bottom;

    const maxWeight = Math.max(...chartData.map(d => d.y));
    const minWeight = Math.min(...chartData.map(d => d.y));
    const weightRange = maxWeight - minWeight || 1;
    const weightPadding = weightRange * 0.1;

    // Calculate xScale to ensure points (including radius) fit within bounds
    // First point center should be at: padding.left + pointRadius
    // Last point center should be at: CHART_WIDTH - padding.right - pointRadius
    // Available width for distribution: CHART_WIDTH - padding.left - padding.right - (pointRadius * 2)
    const availableWidth = CHART_WIDTH - padding.left - padding.right - (pointRadius * 2);
    // Handle single point case - center it in the available space
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

  // Convert data points to SVG coordinates
  const svgPoints = useMemo(() => {
    if (!chartMetrics || chartData.length === 0) return [];
    
    return chartData.map((point, index) => {
      // For single point, center it horizontally
      const x = chartData.length === 1 
        ? chartMetrics.padding.left + (CHART_WIDTH - chartMetrics.padding.left - chartMetrics.padding.right) / 2
        : chartMetrics.padding.left + chartMetrics.pointRadius + (point.x - 1) * chartMetrics.xScale;
      const y = chartMetrics.padding.top + chartMetrics.chartHeight - 
                (point.y - chartMetrics.minWeight) * chartMetrics.yScale;
      return { ...point, svgX: x, svgY: y };
    });
  }, [chartData, chartMetrics]);

  const handlePointPress = (point, event) => {
    // Get the position relative to the chart container
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

  // Helper function to find closest point to coordinates
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
    const { pageX, pageY } = event.nativeEvent;
    // Get the chartWrapper's position relative to page
    // For now, use touch location relative to the responder view
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
        onScrollBeginDrag={() => {
          if (isTouchingChart && scrollViewRef.current) {
            scrollViewRef.current.setNativeProps({ scrollEnabled: false });
          }
        }}
      >
        <View style={styles.content}>
          {exerciseList.length === 0 ? (
            <View style={styles.emptyState}>
              <TrendingUp size={64} color="#4B5563" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Exercise Data</Text>
              <Text style={styles.emptyText}>Complete workouts to track your progress</Text>
            </View>
          ) : (
            <>
              {/* Exercise Dropdown */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>Select Exercise</Text>
                <Pressable
                  style={styles.dropdown}
                  onPress={() => setShowDropdown(true)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedExercise || 'Select an exercise'}
                  </Text>
                  <ChevronDown size={20} color="#9CA3AF" strokeWidth={2} />
                </Pressable>
              </View>

              {/* Chart or Prompt */}
              {!selectedExercise ? (
                <View style={styles.promptContainer}>
                  <TrendingUp size={64} color="#4B5563" strokeWidth={1.5} />
                  <Text style={styles.promptTitle}>Select an Exercise</Text>
                  <Text style={styles.promptText}>
                    Choose an exercise from the dropdown above to view your weight progression over time
                  </Text>
                </View>
              ) : selectedExercise && exercises[selectedExercise] && exercises[selectedExercise].length > 0 ? (
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>{selectedExercise}</Text>
                  <Text style={styles.chartSubtitle}>Weight Progression</Text>
                  
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
                              stroke="#374151"
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
                                fontSize="12"
                                fill="#9CA3AF"
                                textAnchor="end"
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
                          fontSize="12"
                          fill="#9CA3AF"
                          textAnchor="middle"
                          transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
                        >
                          Weight (lbs)
                        </SvgText>

                        {/* X-axis labels - show dates */}
                        {svgPoints.map((point, index) => {
                          // Show every nth label or first/last
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
                                fill="#9CA3AF"
                                textAnchor="middle"
                              >
                                {dateStr}
                              </SvgText>
                            );
                          }
                          return null;
                        })}
                        
                        {/* X-axis title */}
                        <SvgText
                          x={CHART_WIDTH / 2}
                          y={CHART_HEIGHT - 5}
                          fontSize="12"
                          fill="#9CA3AF"
                          textAnchor="middle"
                        >
                          Date
                        </SvgText>

                        {/* Line */}
                        {svgPoints.length > 1 && (
                          <Polyline
                            points={svgPoints.map(p => `${p.svgX},${p.svgY}`).join(' ')}
                            fill="none"
                            stroke="#3B82F6"
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
                            r="6"
                            fill="#3B82F6"
                          />
                        ))}

                        {/* Axes */}
                        <Line
                          x1={chartMetrics.padding.left}
                          y1={chartMetrics.padding.top}
                          x2={chartMetrics.padding.left}
                          y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                          stroke="#4B5563"
                          strokeWidth="2"
                        />
                        <Line
                          x1={chartMetrics.padding.left}
                          y1={chartMetrics.padding.top + chartMetrics.chartHeight}
                          x2={chartMetrics.padding.left + chartMetrics.chartWidth}
                          y2={chartMetrics.padding.top + chartMetrics.chartHeight}
                          stroke="#4B5563"
                          strokeWidth="2"
                        />
                        </Svg>
                        <View
                          style={StyleSheet.absoluteFill}
                          pointerEvents="box-none"
                        />
                        {/* Tooltip positioned over data point */}
                        {tooltipData && tooltipData.svgX !== undefined && (
                          <View
                            style={[
                              styles.tooltip,
                              {
                                position: 'absolute',
                                left: tooltipData.svgX - 60,
                                top: tooltipData.svgY - 80,
                              }
                            ]}
                          >
                            <View style={styles.tooltipHeader}>
                              <Text style={styles.tooltipTitle}>
                                {new Date(tooltipData.date).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={styles.tooltipText}>
                              Weight: {tooltipData.weight} lbs
                            </Text>
                            <Text style={styles.tooltipText}>
                              Reps: {tooltipData.reps}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              ) : selectedExercise ? (
                <View style={styles.emptyChart}>
                  <TrendingUp size={48} color="#4B5563" strokeWidth={1.5} />
                  <Text style={styles.emptyChartTitle}>No Data Available</Text>
                  <Text style={styles.emptyChartText}>
                    You haven't recorded any sets for {selectedExercise} yet.
                  </Text>
                  <Text style={styles.emptyChartSubtext}>
                    Complete a workout with this exercise to see your progress here.
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <Pressable onPress={() => {
                setShowDropdown(false);
                setSearchQuery('');
                setSelectedCategory(null);
              }}>
                <X size={24} color="#fff" strokeWidth={2} />
              </Pressable>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#9CA3AF" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercise..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <X size={18} color="#9CA3AF" strokeWidth={2} />
                </Pressable>
              )}
            </View>

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

            <ScrollView style={styles.modalList}>
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
    backgroundColor: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  dropdownContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  chartContainer: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  tooltip: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tooltipText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  tooltipDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  promptContainer: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyChart: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyChartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyChartSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  categoryContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4B5563',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#3B82F6',
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#374151',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#4B5563',
  },
  modalItemSelected: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#fff',
  },
  modalItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
