import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const PR_STORAGE_KEY = '@traintrack_personal_records';

/**
 * Personal Record data structure
 * {
 *   id: number (Date.now()),
 *   visercise: string,
 *   category: string,
 *   weight: number,
 *   reps: number,
 *   estimatedOneRepMax: number,
 *   date: string (YYYY-MM-DD),
 *   workoutId: number,
 *   workoutName: string
 * }
 */

/**
 * Calculate estimated 1RM using Epley formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Number of reps
 * @returns {number} Estimated 1RM
 */
export function calculateOneRepMax(weight, reps) {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  // Epley formula: 1RM = weight × (1 + reps/30)
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Load all personal records
 * @returns {Promise<Array>} Array of PR objects
 */
export async function loadPersonalRecords() {
  try {
    // Try to load from Supabase first
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        // Cache locally
        await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }

    // Fallback to local storage
    const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading personal records:', error);
    // Try local cache on error
    try {
      const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Save personal records
 * @param {Array} records - Array of PR objects
 */
async function savePersonalRecords(records) {
  try {
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving personal records locally:', error);
  }
}

/**
 * Get the current PR for a specific exercise
 * @param {string} exerciseName - Name of the exercise
 * @returns {Promise<Object|null>} Current PR or null
 */
export async function getPRForExercise(exerciseName) {
  const records = await loadPersonalRecords();
  const exercisePRs = records.filter(pr => pr.exercise === exerciseName);

  if (exercisePRs.length === 0) return null;

  // Return the one with highest weight lifted
  return exercisePRs.reduce((best, current) =>
    current.weight > best.weight ? current : best
  );
}

/**
 * Get PR history for an exercise (all PRs over time)
 * @param {string} exerciseName - Name of the exercise
 * @returns {Promise<Array>} Array of PRs sorted by date
 */
export async function getPRHistory(exerciseName) {
  const records = await loadPersonalRecords();
  return records
    .filter(pr => pr.exercise === exerciseName)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Check a workout for new PRs and save them
 * @param {Object} workout - Workout object with exercises
 * @returns {Promise<Array>} Array of new PRs achieved
 */
export async function checkAndUpdatePRs(workout) {
  const currentRecords = await loadPersonalRecords();
  const newPRs = [];

  // Skip cardio workouts
  if (['Running', 'Cycling', 'Swimming'].includes(workout.type)) {
    return newPRs;
  }

  for (const exercise of workout.exercises) {
    // Skip if no sets or cardio exercise
    if (!exercise.sets || exercise.sets.length === 0) continue;
    if (exercise.sets[0].distance !== undefined && exercise.sets[0].distance > 0) continue;

    // Find best set in this exercise (highest weight lifted)
    let bestSet = null;
    let bestWeight = 0;

    for (const set of exercise.sets) {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;

      if (weight > 0 && reps > 0) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestSet = { weight, reps };
        }
      }
    }

    if (!bestSet) continue;

    // Check against current PR for this exercise
    const currentPR = currentRecords.find(pr => pr.exercise === exercise.name);

    // Create record data for this exercise
    const recordData = {
      id: Date.now() + Math.random(),
      exercise: exercise.name,
      weight: bestSet.weight,
      reps: bestSet.reps,
      estimatedOneRepMax: calculateOneRepMax(bestSet.weight, bestSet.reps),
      date: workout.date,
      workoutId: workout.id,
      workoutName: workout.name,
      previousWeight: currentPR?.weight || null,
      previousReps: currentPR?.reps || null,
    };

    if (currentPR) {
      // Exercise was done before - check if this beats the record
      if (bestWeight > currentPR.weight) {
        // This is a real PR - beat an existing record!
        newPRs.push(recordData);
        const index = currentRecords.findIndex(pr => pr.exercise === exercise.name);
        currentRecords[index] = recordData;
      }
    } else {
      // First time doing this exercise - save for tracking but NOT a celebratory PR
      currentRecords.push(recordData);
    }
  }

  // Save updated records if anything changed
  const recordsChanged = currentRecords.length > 0;
  if (recordsChanged) {
    // STEP 1: Save locally (instant)
    await savePersonalRecords(currentRecords);

    // STEP 2: Sync celebration-worthy PRs to cloud in background
    if (newPRs.length > 0) {
      syncPRsToCloud(newPRs).catch(err => {
        console.error('Background PR sync failed:', err);
      });
    }
  }

  return newPRs;
}

// Background cloud sync for PRs
async function syncPRsToCloud(newPRs) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sync PRs in parallel - delete old then insert new for each exercise
    await Promise.all(newPRs.map(async (pr) => {
      // Delete existing PR for this exercise (if any)
      await supabase
        .from('personal_records')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise', pr.exercise);

      // Insert new PR
      const { error } = await supabase
        .from('personal_records')
        .insert({
          user_id: user.id,
          exercise: pr.exercise,
          weight: pr.weight,
          reps: pr.reps,
          estimated_one_rep_max: pr.estimatedOneRepMax,
          date: pr.date,
          workout_id: pr.workoutId,
          workout_name: pr.workoutName,
        });

      if (error) {
        console.error('Error syncing PR to cloud:', pr.exercise, error);
      }
    }));
  } catch (error) {
    console.error('Error syncing PRs to cloud:', error);
  }
}

/**
 * Get all PRs grouped by category/muscle group
 * @returns {Promise<Object>} PRs grouped by category
 */
export async function getPRsByCategory() {
  const { EXERCISE_DATABASE } = await import('../constants/workoutTypes');
  const records = await loadPersonalRecords();

  const grouped = {};

  for (const pr of records) {
    // Find which category this exercise belongs to
    let category = 'Other';
    for (const [cat, exercises] of Object.entries(EXERCISE_DATABASE)) {
      if (exercises.includes(pr.exercise)) {
        category = cat;
        break;
      }
    }

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(pr);
  }

  // Sort each category by weight lifted
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => b.weight - a.weight);
  }

  return grouped;
}

/**
 * Get summary stats for PRs
 * @returns {Promise<Object>} Summary statistics
 */
export async function getPRStats() {
  const records = await loadPersonalRecords();

  if (records.length === 0) {
    return {
      totalPRs: 0,
      recentPRs: 0,
      topExercise: null,
      totalWeight: 0,
    };
  }

  // Count PRs in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPRs = records.filter(pr => new Date(pr.date) >= thirtyDaysAgo).length;

  // Find top exercise by weight lifted
  const topExercise = records.reduce((best, current) =>
    current.weight > (best?.weight || 0) ? current : best
  , null);

  // Total weight across all PRs
  const totalWeight = records.reduce((sum, pr) => sum + pr.weight, 0);

  return {
    totalPRs: records.length,
    recentPRs,
    topExercise,
    totalWeight,
  };
}

/**
 * Delete a personal record
 * @param {string} exerciseName - Exercise to delete PR for
 */
export async function deletePR(exerciseName) {
  const records = await loadPersonalRecords();
  const filtered = records.filter(pr => pr.exercise !== exerciseName);
  await savePersonalRecords(filtered);

  // Try to delete from Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('personal_records')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise', exerciseName);
    }
  } catch (error) {
    console.error('Error deleting PR from cloud:', error);
  }
}
