import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { updateGoalProgress } from './goalsStorage';

const STORAGE_KEYS = {
  WORKOUTS: '@traintrack_workouts',
  STATS: '@traintrack_stats',
  LAST_SYNC: '@traintrack_last_sync',
  SYNC_STATUS: '@traintrack_sync_status'
};

// Sync status types
export const SYNC_STATUS = {
  SYNCED: 'synced',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error'
};

// Helper to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Update sync status
export const updateSyncStatus = async (status) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATUS, status);
    if (status === SYNC_STATUS.SYNCED) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    }
  } catch (error) {
    console.warn('Failed to update sync status:', error);
  }
};

// Get current sync status
export const getSyncStatus = async () => {
  try {
    const status = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return {
      status: status || SYNC_STATUS.OFFLINE,
      lastSync: lastSync ? new Date(lastSync) : null
    };
  } catch (error) {
    return { status: SYNC_STATUS.OFFLINE, lastSync: null };
  }
};

// Show sync error to user
const showSyncError = (message) => {
  Alert.alert(
    'Sync Issue',
    message || 'Changes saved locally. Will sync when connection is restored.',
    [{ text: 'OK' }]
  );
};

// Detect rate limit errors (HTTP 429 or specific error messages)
const isRateLimitError = (error) => {
  if (!error) return false;
  const code = error?.code || error?.status;
  const message = error?.message?.toLowerCase() || '';
  return (
    code === 429 ||
    code === '429' ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded')
  );
};

// Background cloud sync - runs without blocking UI
const syncToCloud = async (workouts) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      await updateSyncStatus(SYNC_STATUS.OFFLINE);
      return;
    }

    await updateSyncStatus(SYNC_STATUS.SYNCING);

    // Get existing workout IDs from cloud
    const { data: cloudWorkouts, error: fetchError } = await supabase
      .from('workouts')
      .select('workout_id')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Failed to fetch cloud workouts:', fetchError);
      await updateSyncStatus(SYNC_STATUS.ERROR);
      return;
    }

    const cloudIds = new Set((cloudWorkouts || []).map(w => String(w.workout_id)));
    const localIds = new Set(workouts.map(w => String(w.id)));

    // Prepare data for batch operations
    const toInsert = [];
    const toUpsert = [];

    for (const workout of workouts) {
      const workoutData = {
        user_id: user.id,
        workout_id: workout.id,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        time: workout.time || null,
        notes: workout.notes || null,
        exercises: workout.exercises || []
      };

      if (cloudIds.has(String(workout.id))) {
        toUpsert.push(workoutData);
      } else {
        toInsert.push(workoutData);
      }
    }

    // Batch insert new workouts
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('workouts')
        .insert(toInsert);

      if (insertError) {
        console.error('Insert failed:', insertError);
      }
    }

    // Update existing workouts (parallel updates for speed)
    if (toUpsert.length > 0) {
      await Promise.all(toUpsert.map(workout =>
        supabase
          .from('workouts')
          .update(workout)
          .eq('user_id', workout.user_id)
          .eq('workout_id', workout.workout_id)
          .then(({ error }) => {
            if (error) console.error('Update failed:', workout.workout_id, error);
          })
      ));
    }

    // Delete workouts that are no longer in local list
    const idsToDelete = [...cloudIds].filter(id => !localIds.has(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('workouts')
        .delete()
        .eq('user_id', user.id)
        .in('workout_id', idsToDelete);
    }

    await updateSyncStatus(SYNC_STATUS.SYNCED);
  } catch (error) {
    console.error('Cloud sync error:', error);
    await updateSyncStatus(SYNC_STATUS.ERROR);
  }
};

// Save workouts - LOCAL FIRST, then background cloud sync
export const saveWorkouts = async (workouts, options = {}) => {
  const { silent = false } = options;

  try {
    // STEP 1: Save locally FIRST (instant)
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));

    // STEP 2: Update goal progress based on workouts (non-blocking)
    updateGoalProgress(workouts).catch(err => {
      console.error('Goal progress update failed:', err);
    });

    // STEP 3: Trigger cloud sync in background (non-blocking)
    // Don't await - let it run in background
    syncToCloud(workouts).catch(err => {
      console.error('Background sync failed:', err);
    });

    return { success: true, cloudSync: true };
  } catch (error) {
    console.error('Local save failed:', error);
    if (!silent) {
      Alert.alert(
        'Save Failed',
        'Couldn\'t save your workout. Please try again.',
        [{ text: 'OK' }]
      );
    }
    return { success: false, cloudSync: false };
  }
};

// Load workouts - LOCAL FIRST (instant), optional background cloud refresh
export const loadWorkouts = async (options = {}) => {
  const { skipBackgroundRefresh = false } = options;

  // STEP 1: Return local data immediately (instant)
  const localData = await loadFromLocalCache();

  // STEP 2: Optionally trigger background cloud sync
  // Skip during save operations to avoid race conditions
  if (!skipBackgroundRefresh) {
    refreshFromCloud().catch(err => {
      console.error('Background cloud refresh failed:', err);
    });
  }

  return localData;
};

// Background cloud refresh - updates local cache for next load
const refreshFromCloud = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      await updateSyncStatus(SYNC_STATUS.OFFLINE);
      return;
    }

    await updateSyncStatus(SYNC_STATUS.SYNCING);

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Cloud refresh failed:', error);
      await updateSyncStatus(SYNC_STATUS.ERROR);
      return;
    }

    if (data && data.length > 0) {
      const workouts = data.map(w => ({
        id: typeof w.workout_id === 'string' ? parseInt(w.workout_id, 10) : w.workout_id,
        name: w.name,
        type: w.type,
        date: w.date,
        time: w.time,
        notes: w.notes,
        exercises: w.exercises || []
      }));

      // Update local cache
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    }

    await updateSyncStatus(SYNC_STATUS.SYNCED);
  } catch (error) {
    console.error('Cloud refresh error:', error);
    await updateSyncStatus(SYNC_STATUS.ERROR);
  }
};

// Helper: Load from local AsyncStorage
const loadFromLocalCache = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

// Migrate existing local workouts to cloud (call this once after login)
export const migrateLocalToCloud = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    // Load existing local workouts
    const localWorkouts = await loadFromLocalCache();
    
    if (localWorkouts.length === 0) return;

    // Check if user already has workouts in cloud
    const { data: existingCloudWorkouts } = await supabase
      .from('workouts')
      .select('workout_id')
      .eq('user_id', user.id);

    // Use string comparison for consistency (Supabase may return different types)
    const existingIds = new Set(existingCloudWorkouts?.map(w => String(w.workout_id)) || []);

    // Only migrate workouts that don't exist in cloud
    const workoutsToMigrate = localWorkouts
      .filter(w => !existingIds.has(String(w.id)))
      .map(workout => ({
        user_id: user.id,
        workout_id: workout.id,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        time: workout.time || null,
        notes: workout.notes || null,
        exercises: workout.exercises || []
      }));

    if (workoutsToMigrate.length > 0) {
      const { error } = await supabase
        .from('workouts')
        .insert(workoutsToMigrate);

      if (error) {
        // Error migrating workouts
      }
    }
  } catch (error) {
    // Error during migration
  }
};

export { getTodayString } from './dateFormatter';

export const clearLocalWorkouts = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.WORKOUTS);
  } catch (error) {
    // Error clearing local workouts
  }
};
