import AsyncStorage from '@react-native-async-storage/async-storage';

const WEIGHT_STORAGE_KEY = '@traintrack_weight_data';

/**
 * Format date to YYYY-MM-DD in local timezone
 */
const formatLocalDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Default weight data structure
 */
const createDefaultWeightData = () => ({
  entries: [],
  goal: null,
  settings: {
    unit: 'lbs',
    reminderEnabled: false,
    reminderTime: '08:00',
  },
});

/**
 * Load all weight data
 */
export const loadWeightData = async () => {
  try {
    const data = await AsyncStorage.getItem(WEIGHT_STORAGE_KEY);
    if (!data) return createDefaultWeightData();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading weight data:', error);
    return createDefaultWeightData();
  }
};

/**
 * Save weight data
 */
export const saveWeightData = async (data) => {
  try {
    await AsyncStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    console.error('Error saving weight data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a new weight entry
 * @param {number} weight - The weight value
 * @param {string} notes - Optional notes
 * @param {Date|string} date - Optional date (defaults to today)
 */
export const addWeightEntry = async (weight, notes = '', date = null) => {
  try {
    const data = await loadWeightData();
    const entryDate = date ? formatLocalDate(new Date(date)) : formatLocalDate(new Date());

    // Check if entry for this date already exists
    const existingIndex = data.entries.findIndex(e => e.date === entryDate);

    const entry = {
      id: Date.now(),
      date: entryDate,
      weight: parseFloat(weight),
      notes,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing entry
      data.entries[existingIndex] = entry;
    } else {
      // Add new entry
      data.entries.push(entry);
    }

    // Sort entries by date (newest first)
    data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    await saveWeightData(data);
    return { success: true, entry };
  } catch (error) {
    console.error('Error adding weight entry:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a weight entry
 */
export const deleteWeightEntry = async (entryId) => {
  try {
    const data = await loadWeightData();
    data.entries = data.entries.filter(e => e.id !== entryId);
    await saveWeightData(data);
    return { success: true };
  } catch (error) {
    console.error('Error deleting weight entry:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Set weight goal
 */
export const setWeightGoal = async (targetWeight, direction = 'lose') => {
  try {
    const data = await loadWeightData();

    // Get current weight (most recent entry)
    const currentWeight = data.entries.length > 0 ? data.entries[0].weight : null;

    data.goal = {
      targetWeight: parseFloat(targetWeight),
      startWeight: currentWeight,
      startDate: formatLocalDate(new Date()),
      targetDate: null,
      direction, // 'lose', 'gain', or 'maintain'
      createdAt: new Date().toISOString(),
    };

    await saveWeightData(data);
    return { success: true, goal: data.goal };
  } catch (error) {
    console.error('Error setting weight goal:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear weight goal
 */
export const clearWeightGoal = async () => {
  try {
    const data = await loadWeightData();
    data.goal = null;
    await saveWeightData(data);
    return { success: true };
  } catch (error) {
    console.error('Error clearing weight goal:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update weight settings
 */
export const updateWeightSettings = async (settings) => {
  try {
    const data = await loadWeightData();
    data.settings = { ...data.settings, ...settings };
    await saveWeightData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating weight settings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current weight (most recent entry)
 */
export const getCurrentWeight = async () => {
  try {
    const data = await loadWeightData();
    if (data.entries.length === 0) return null;
    return data.entries[0].weight;
  } catch (error) {
    console.error('Error getting current weight:', error);
    return null;
  }
};

/**
 * Get weight entries for a date range
 */
export const getWeightEntriesForRange = async (startDate, endDate) => {
  try {
    const data = await loadWeightData();
    return data.entries.filter(e => {
      return e.date >= startDate && e.date <= endDate;
    });
  } catch (error) {
    console.error('Error getting weight entries for range:', error);
    return [];
  }
};

/**
 * Get weight entries for last N days
 */
export const getRecentWeightEntries = async (days = 30) => {
  try {
    const data = await loadWeightData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = formatLocalDate(cutoffDate);

    return data.entries.filter(e => e.date >= cutoffString);
  } catch (error) {
    console.error('Error getting recent weight entries:', error);
    return [];
  }
};

/**
 * Calculate weight progress toward goal
 */
export const calculateWeightProgress = (data) => {
  if (!data.goal || data.entries.length === 0) {
    return null;
  }

  const { targetWeight, startWeight, direction } = data.goal;
  const currentWeight = data.entries[0].weight;

  if (!startWeight) {
    return {
      currentWeight,
      targetWeight,
      progress: 0,
      remaining: Math.abs(targetWeight - currentWeight),
      changed: 0,
      direction,
      isComplete: false,
    };
  }

  const totalToChange = Math.abs(targetWeight - startWeight);
  const changed = Math.abs(currentWeight - startWeight);
  const remaining = Math.abs(targetWeight - currentWeight);

  // Calculate progress (0-100)
  let progress = 0;
  if (totalToChange > 0) {
    if (direction === 'lose') {
      progress = startWeight > currentWeight
        ? Math.min(100, ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100)
        : 0;
    } else if (direction === 'gain') {
      progress = currentWeight > startWeight
        ? Math.min(100, ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100)
        : 0;
    }
  }

  // Check if goal is complete
  const isComplete = direction === 'lose'
    ? currentWeight <= targetWeight
    : direction === 'gain'
      ? currentWeight >= targetWeight
      : Math.abs(currentWeight - targetWeight) < 1;

  return {
    currentWeight,
    targetWeight,
    startWeight,
    progress: Math.round(progress),
    remaining,
    changed,
    direction,
    isComplete,
  };
};

/**
 * Calculate weight change between two dates
 */
export const calculateWeightChange = (entries, days = 7) => {
  if (entries.length < 2) return null;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffString = formatLocalDate(cutoffDate);

  const recentEntries = entries.filter(e => e.date >= cutoffString);
  if (recentEntries.length < 2) return null;

  const newest = recentEntries[0];
  const oldest = recentEntries[recentEntries.length - 1];

  return {
    change: newest.weight - oldest.weight,
    percentage: ((newest.weight - oldest.weight) / oldest.weight) * 100,
    days: Math.round((new Date(newest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)),
  };
};

/**
 * Get consecutive days logged (for achievements)
 */
export const getConsecutiveDaysLogged = async () => {
  try {
    const data = await loadWeightData();
    if (data.entries.length === 0) return 0;

    // Sort by date descending
    const sorted = [...data.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    let consecutive = 1;
    let currentDate = new Date(sorted[0].date);

    for (let i = 1; i < sorted.length; i++) {
      const entryDate = new Date(sorted[i].date);
      const diffDays = Math.round((currentDate - entryDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        consecutive++;
        currentDate = entryDate;
      } else {
        break;
      }
    }

    return consecutive;
  } catch (error) {
    console.error('Error getting consecutive days logged:', error);
    return 0;
  }
};

/**
 * Get total goals reached (for achievements)
 */
export const getGoalsReachedCount = async () => {
  // This would need to be tracked in a separate history
  // For now, return 0 - can be enhanced later
  return 0;
};

/**
 * Format weight for display
 */
export const formatWeight = (weight, unit = 'lbs') => {
  if (weight === null || weight === undefined) return '--';
  return `${weight.toFixed(1)} ${unit}`;
};

/**
 * Format weight change for display
 */
export const formatWeightChange = (change, unit = 'lbs') => {
  if (change === null || change === undefined) return '';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)} ${unit}`;
};

/**
 * Convert weight between units
 */
export const convertWeight = (weight, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'lbs' && toUnit === 'kg') return weight * 0.453592;
  if (fromUnit === 'kg' && toUnit === 'lbs') return weight * 2.20462;
  return weight;
};
