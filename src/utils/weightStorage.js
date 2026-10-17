import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { parseLocalDate } from './dateFormatter';

const WEIGHT_STORAGE_KEY = '@traintrack_weight_data';

// Helper to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

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
 * Load all weight data - local first, then background cloud refresh
 */
export const loadWeightData = async () => {
  try {
    // Load local data immediately
    const localData = await AsyncStorage.getItem(WEIGHT_STORAGE_KEY);
    const data = localData ? JSON.parse(localData) : createDefaultWeightData();

    // Trigger background cloud refresh (non-blocking)
    refreshWeightDataFromCloud().catch(err => {
      console.warn('Background weight sync failed:', err?.message);
    });

    return data;
  } catch (error) {
    console.error('Error loading weight data:', error);
    return createDefaultWeightData();
  }
};

/**
 * Load weight data from local storage only (no cloud refresh)
 */
const loadLocalWeightData = async () => {
  try {
    const data = await AsyncStorage.getItem(WEIGHT_STORAGE_KEY);
    return data ? JSON.parse(data) : createDefaultWeightData();
  } catch (error) {
    console.warn('Error loading local weight data:', error?.message);
    return createDefaultWeightData();
  }
};

/**
 * Save weight data - local first, then background cloud sync
 */
export const saveWeightData = async (data) => {
  try {
    // Save locally first (instant)
    await AsyncStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(data));

    // Sync to cloud in background (non-blocking)
    syncWeightDataToCloud(data).catch(err => {
      console.warn('Weight cloud sync failed:', err?.message);
    });

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
 * @param {Array} media - Optional array of media objects [{uri, type, id, thumbnail?}]
 */
export const addWeightEntry = async (weight, notes = '', date = null, media = []) => {
  try {
    const data = await loadLocalWeightData();
    const entryDate = date ? formatLocalDate(new Date(date)) : formatLocalDate(new Date());

    // Check if entry for this date already exists
    const existingIndex = data.entries.findIndex(e => e.date === entryDate);

    const entry = {
      id: Date.now(),
      date: entryDate,
      weight: parseFloat(weight),
      notes,
      media: media || [],
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing entry, preserve existing media if not provided
      const existingEntry = data.entries[existingIndex];
      if (!media || media.length === 0) {
        entry.media = existingEntry.media || [];
      }
      data.entries[existingIndex] = entry;
    } else {
      // Add new entry
      data.entries.push(entry);
    }

    // Sort entries by date (newest first)
    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    data.entries.sort((a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00'));

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
    const data = await loadLocalWeightData();
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
    const data = await loadLocalWeightData();

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
    const data = await loadLocalWeightData();
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
    const data = await loadLocalWeightData();
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
    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    days: Math.round((new Date(newest.date + 'T12:00:00') - new Date(oldest.date + 'T12:00:00')) / (1000 * 60 * 60 * 24)),
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
    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    const parseDate = (dateStr) => new Date(dateStr + 'T12:00:00');
    const sorted = [...data.entries].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    let consecutive = 1;
    let currentDate = parseDate(sorted[0].date);

    for (let i = 1; i < sorted.length; i++) {
      const entryDate = parseDate(sorted[i].date);
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

// ============================================
// CLOUD SYNC FUNCTIONS
// ============================================

/**
 * Sync weight data to cloud (background operation)
 */
const syncWeightDataToCloud = async (data) => {
  try {
    const user = await getCurrentUser();
    if (!user) return; // Not logged in, skip cloud sync

    // Sync weight entries
    if (data.entries && data.entries.length > 0) {
      // Get existing cloud entries
      const { data: cloudEntries } = await supabase
        .from('weight_entries')
        .select('entry_id')
        .eq('user_id', user.id);

      const cloudIds = new Set((cloudEntries || []).map(e => String(e.entry_id)));
      const localIds = new Set(data.entries.map(e => String(e.id)));

      // Prepare entries for upsert
      const entriesToUpsert = data.entries.map(entry => ({
        user_id: user.id,
        entry_id: entry.id,
        date: entry.date,
        weight: entry.weight,
        notes: entry.notes || null,
        media: entry.media || [],
        created_at: entry.createdAt || new Date().toISOString(),
      }));

      // Upsert all entries
      if (entriesToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('weight_entries')
          .upsert(entriesToUpsert, {
            onConflict: 'user_id,entry_id',
          });

        if (upsertError) {
          console.warn('Weight entries upsert error:', upsertError?.message);
        }
      }

      // Delete entries that no longer exist locally
      const idsToDelete = [...cloudIds].filter(id => !localIds.has(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from('weight_entries')
          .delete()
          .eq('user_id', user.id)
          .in('entry_id', idsToDelete);
      }
    }

    // Sync weight settings and goal
    const settingsData = {
      user_id: user.id,
      unit: data.settings?.unit || 'lbs',
      reminder_enabled: data.settings?.reminderEnabled || false,
      reminder_time: data.settings?.reminderTime || '08:00',
      goal_target_weight: data.goal?.targetWeight || null,
      goal_start_weight: data.goal?.startWeight || null,
      goal_start_date: data.goal?.startDate || null,
      goal_direction: data.goal?.direction || null,
      updated_at: new Date().toISOString(),
    };

    const { error: settingsError } = await supabase
      .from('weight_settings')
      .upsert(settingsData, {
        onConflict: 'user_id',
      });

    if (settingsError) {
      console.warn('Weight settings sync error:', settingsError?.message);
    }
  } catch (error) {
    console.warn('Weight cloud sync error:', error?.message);
  }
};

/**
 * Refresh weight data from cloud (background operation)
 */
export const refreshWeightDataFromCloud = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return; // Not logged in, skip

    // Load current local data
    const localData = await loadLocalWeightData();

    // Fetch entries from cloud
    const { data: cloudEntries, error: entriesError } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (entriesError) {
      console.warn('Error fetching cloud weight entries:', entriesError?.message);
      return;
    }

    // Fetch settings from cloud
    const { data: cloudSettings } = await supabase
      .from('weight_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Merge cloud data with local
    if (cloudEntries && cloudEntries.length > 0) {
      // Create a map of cloud entries by ID
      const cloudEntryMap = new Map();
      cloudEntries.forEach(e => {
        cloudEntryMap.set(String(e.entry_id), {
          id: e.entry_id,
          date: e.date,
          weight: e.weight,
          notes: e.notes || '',
          media: e.media || [],
          createdAt: e.created_at,
        });
      });

      // Merge: prefer cloud data for existing entries, keep local-only entries
      const localEntryMap = new Map();
      localData.entries.forEach(e => localEntryMap.set(String(e.id), e));

      // Combine both sets
      const mergedEntries = [];
      const seenIds = new Set();

      // Add all cloud entries first
      cloudEntryMap.forEach((entry, id) => {
        mergedEntries.push(entry);
        seenIds.add(id);
      });

      // Add local entries that aren't in cloud (these will sync next time)
      localEntryMap.forEach((entry, id) => {
        if (!seenIds.has(id)) {
          mergedEntries.push(entry);
        }
      });

      // Sort by date descending
      mergedEntries.sort((a, b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        return dateB - dateA;
      });

      localData.entries = mergedEntries;
    }

    // Update settings from cloud if available
    if (cloudSettings) {
      localData.settings = {
        unit: cloudSettings.unit || 'lbs',
        reminderEnabled: cloudSettings.reminder_enabled || false,
        reminderTime: cloudSettings.reminder_time || '08:00',
      };

      // Update goal from cloud if available
      if (cloudSettings.goal_target_weight) {
        localData.goal = {
          targetWeight: cloudSettings.goal_target_weight,
          startWeight: cloudSettings.goal_start_weight,
          startDate: cloudSettings.goal_start_date,
          targetDate: null,
          direction: cloudSettings.goal_direction || 'lose',
          createdAt: cloudSettings.updated_at,
        };
      }
    }

    // Save merged data locally
    await AsyncStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(localData));
  } catch (error) {
    console.warn('Weight cloud refresh error:', error?.message);
  }
};

/**
 * Migrate existing local weight data to cloud (call after login)
 */
export const migrateWeightDataToCloud = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const localData = await loadLocalWeightData();

    // Only migrate if there's local data
    if (localData.entries.length === 0 && !localData.goal) {
      return;
    }

    // Check if user already has data in cloud
    const { data: existingEntries } = await supabase
      .from('weight_entries')
      .select('entry_id')
      .eq('user_id', user.id)
      .limit(1);

    // If user already has cloud data, just sync (don't duplicate)
    if (existingEntries && existingEntries.length > 0) {
      // Already has cloud data, trigger a refresh instead
      await refreshWeightDataFromCloud();
      return;
    }

    // Migrate local data to cloud
    await syncWeightDataToCloud(localData);
  } catch (error) {
    console.warn('Weight data migration error:', error?.message);
  }
};
