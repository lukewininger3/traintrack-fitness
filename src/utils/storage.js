import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const STORAGE_KEYS = {
  WORKOUTS: '@traintrack_workouts',
  STATS: '@traintrack_stats'
};

// Helper to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Save workouts to BOTH cloud and local cache
export const saveWorkouts = async (workouts) => {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      // Save to Supabase (cloud)
      const workoutsToSave = workouts.map(workout => ({
        user_id: user.id,
        workout_id: workout.id,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        time: workout.time || null,
        notes: workout.notes || null,
        exercises: workout.exercises || []
      }));

      // Delete old workouts for this user, then insert new ones
      const { error: deleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        // Error deleting old workouts
      }

      // Insert all workouts
      const { error: insertError } = await supabase
        .from('workouts')
        .insert(workoutsToSave);

      if (insertError) {
        // Still save locally even if cloud fails
      }
    }

    // Always save to local cache (works offline)
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  } catch (error) {
    // Fallback: save locally even if cloud sync fails
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    } catch (localError) {
      // Error saving locally
    }
  }
};

// Load workouts from cloud (with local cache fallback)
export const loadWorkouts = async () => {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      // Try to load from Supabase (cloud)
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        // Fallback to local cache
        return await loadFromLocalCache();
      }

      if (data && data.length > 0) {
        // Transform Supabase data back to app format
        const workouts = data.map(w => ({
          id: w.workout_id,
          name: w.name,
          type: w.type,
          date: w.date,
          time: w.time,
          notes: w.notes,
          exercises: w.exercises
        }));

        // Cache locally for offline access
        await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
        
        return workouts;
      }
    }

    // No user or no data - load from local cache
    return await loadFromLocalCache();
  } catch (error) {
    // Fallback to local cache
    return await loadFromLocalCache();
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

    const existingIds = new Set(existingCloudWorkouts?.map(w => w.workout_id) || []);

    // Only migrate workouts that don't exist in cloud
    const workoutsToMigrate = localWorkouts
      .filter(w => !existingIds.has(w.id))
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
