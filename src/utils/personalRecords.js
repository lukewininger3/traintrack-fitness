import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const PR_STORAGE_KEY = '@traintrack_personal_records';
const PR_MIGRATION_KEY = '@traintrack_pr_migration_v1';

// Module-level flag to block background sync during data clear
let _syncBlocked = false;

// Mapping from old exercise names to new equipment-prefixed names
const EXERCISE_NAME_MIGRATION = {
  'Barbell Bench Press': 'BB Bench Press',
  'Bench Press': 'BB Bench Press',
  'Barbell Squat': 'BB Back Squat',
  'Squat': 'BB Back Squat',
  'Barbell Deadlift': 'BB Deadlift',
  'Deadlift': 'BB Deadlift',
  'Overhead Press': 'BB Overhead Press',
  'Barbell Row': 'BB Bent Over Row',
  'Bent Over Row': 'BB Bent Over Row',
  'Barbell Curl': 'BB Curl',
  'Dumbbell Bench Press': 'DB Bench Press',
  'Dumbbell Press': 'DB Bench Press',
  'Incline Dumbbell Press': 'DB Incline Bench Press',
  'Dumbbell Curl': 'DB Curl',
  'Dumbbell Shoulder Press': 'DB Overhead Press',
  'Dumbbell Row': 'DB Row',
  'Dumbbell Lateral Raise': 'DB Lateral Raises',
  'Lateral Raises': 'DB Lateral Raises',
  'Lateral Raise': 'DB Lateral Raises',
  'Tricep Pushdown': 'Cable Rope Pushdown',
  'Cable Row': 'Seated Cable Row',
  'Front Squat': 'BB Front Squat',
  'Romanian Deadlift': 'BB Romanian Deadlift',
  'Calf Raise': 'Standing Calf Raises',
  'Calf Raises': 'Standing Calf Raises',
  'Face Pull': 'Face Pulls',
  'Hammer Curl': 'DB Hammer Curl',
  'Walking Lunges': 'DB Walking Lunges',
  'Incline Bench Press': 'BB Incline Bench Press',
  'Decline Bench Press': 'BB Decline Bench Press',
  'Close-Grip Bench Press': 'BB Close-Grip Bench Press',
  'Skull Crushers': 'BB Skull Crushers',
  'Preacher Curl': 'BB Preacher Curl',
  'Hip Thrust': 'BB Hip Thrust',
  'Shrugs': 'BB Shrugs',
  'Upright Row': 'BB Upright Row',
  'Overhead Tricep Extension': 'DB Overhead Tricep Extension',
};

/**
 * Migrate exercise name from old format to new equipment-prefixed format
 * @param {string} exerciseName - Original exercise name
 * @returns {string} Migrated exercise name (or original if no mapping exists)
 */
function migrateExerciseName(exerciseName) {
  return EXERCISE_NAME_MIGRATION[exerciseName] || exerciseName;
}

/**
 * Migrate all PR records to use new exercise naming convention
 * @param {Array} records - Array of PR objects
 * @returns {Array} Migrated records with updated exercise names
 */
function migrateRecords(records) {
  let hasChanges = false;
  const migratedRecords = records.map(pr => {
    const newName = migrateExerciseName(pr.exercise);
    if (newName !== pr.exercise) {
      hasChanges = true;
      return { ...pr, exercise: newName };
    }
    return pr;
  });

  // Consolidate duplicate exercises (same exercise with different old names)
  if (hasChanges) {
    const consolidatedMap = new Map();
    for (const pr of migratedRecords) {
      const existing = consolidatedMap.get(pr.exercise);
      if (!existing || pr.weight > existing.weight) {
        consolidatedMap.set(pr.exercise, pr);
      }
    }
    return Array.from(consolidatedMap.values());
  }

  return migratedRecords;
}

/**
 * Run one-time migration for PR exercise names
 * @returns {Promise<boolean>} Whether migration was performed
 */
async function runMigrationIfNeeded() {
  try {
    const migrated = await AsyncStorage.getItem(PR_MIGRATION_KEY);
    if (migrated) return false;

    const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
    if (!json) {
      await AsyncStorage.setItem(PR_MIGRATION_KEY, 'true');
      return false;
    }

    const records = JSON.parse(json);
    const migratedRecords = migrateRecords(records);

    // Save migrated records locally
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(migratedRecords));
    await AsyncStorage.setItem(PR_MIGRATION_KEY, 'true');

    // Update cloud records if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update each migrated record in cloud
      for (const pr of migratedRecords) {
        const oldName = Object.entries(EXERCISE_NAME_MIGRATION)
          .find(([_, newName]) => newName === pr.exercise)?.[0];

        if (oldName) {
          // Delete old record and insert updated one
          await supabase
            .from('personal_records')
            .delete()
            .eq('user_id', user.id)
            .eq('exercise', oldName);
        }

        await supabase
          .from('personal_records')
          .upsert({
            user_id: user.id,
            exercise: pr.exercise,
            weight: pr.weight,
            reps: pr.reps,
            estimated_one_rep_max: pr.estimatedOneRepMax,
            date: pr.date,
            workout_id: pr.workoutId,
            workout_name: pr.workoutName,
          }, { onConflict: 'user_id,exercise' });
      }
    }

    console.log('PR exercise name migration completed');
    return true;
  } catch (error) {
    console.error('Error during PR migration:', error);
    return false;
  }
}

/**
 * Calculate estimated 1RM using Epley formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Number of reps
 * @returns {number} Estimated 1RM
 */
export function calculateOneRepMax(weight, reps) {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Load all personal records.
 * Runs migration if needed, tries cloud first (caches result locally), falls back to local.
 * @returns {Promise<Array>} Array of PR objects
 */
export async function loadPersonalRecords() {
  try {
    // Run migration for exercise name changes (one-time)
    await runMigrationIfNeeded();

    // If a clear is in progress, return local only (which will be empty)
    if (_syncBlocked) {
      const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        // Map snake_case fields from Supabase to camelCase
        const mappedData = data.map(pr => ({
          id: pr.id,
          exercise: pr.exercise,
          weight: pr.weight,
          reps: pr.reps,
          estimatedOneRepMax: pr.estimated_one_rep_max,
          date: pr.date,
          workoutId: pr.workout_id,
          workoutName: pr.workout_name,
        }));
        // Apply migration to cloud data as well (in case cloud has old names)
        const migratedData = migrateRecords(mappedData);
        await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(migratedData));
        return migratedData;
      }
    }

    const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading personal records:', error);
    try {
      const json = await AsyncStorage.getItem(PR_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Save personal records locally
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
    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    .sort((a, b) => new Date(a.date + 'T12:00:00') - new Date(b.date + 'T12:00:00'));
}

/**
 * Check a workout for new PRs and save them.
 * Only returns celebration-worthy PRs (exercise must have a previous record to beat).
 * @param {Object} workout - Workout object with exercises
 * @returns {Promise<Array>} Array of new PRs achieved (for celebration)
 */
export async function checkAndUpdatePRs(workout) {
  // Don't process PRs if a data clear is in progress
  if (_syncBlocked) return [];

  const currentRecords = await loadPersonalRecords();
  const newPRs = [];
  const changedRecords = [];

  // Skip cardio workouts
  if (['Running', 'Cycling', 'Swimming'].includes(workout.type)) {
    return newPRs;
  }

  for (const exercise of workout.exercises) {
    if (!exercise.sets || exercise.sets.length === 0) continue;
    if (exercise.sets[0].distance !== undefined && exercise.sets[0].distance > 0) continue;

    let bestWeightSet = null;
    let bestWeight = 0;
    let best1RMSet = null;
    let best1RM = 0;

    for (const set of exercise.sets) {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;

      if (weight > 0 && reps > 0) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestWeightSet = { weight, reps };
        }
        const estimated1RM = calculateOneRepMax(weight, reps);
        if (estimated1RM > best1RM) {
          best1RM = estimated1RM;
          best1RMSet = { weight, reps, estimated1RM };
        }
      }
    }

    if (!bestWeightSet) continue;

    const bestSet = best1RMSet || bestWeightSet;
    const estimated1RM = calculateOneRepMax(bestSet.weight, bestSet.reps);

    const currentPR = currentRecords.find(pr => pr.exercise === exercise.name);

    const recordData = {
      id: Date.now() + Math.random(),
      exercise: exercise.name,
      weight: bestSet.weight,
      reps: bestSet.reps,
      estimatedOneRepMax: estimated1RM,
      date: workout.date,
      workoutId: workout.id,
      workoutName: workout.name,
      previousWeight: currentPR?.weight || null,
      previousReps: currentPR?.reps || null,
      previous1RM: currentPR?.estimatedOneRepMax || null,
    };

    if (currentPR) {
      const isWeightPR = bestWeight > currentPR.weight;
      const is1RMPR = estimated1RM > (currentPR.estimatedOneRepMax || 0);

      if (isWeightPR || is1RMPR) {
        newPRs.push(recordData);
        const index = currentRecords.findIndex(pr => pr.exercise === exercise.name);
        currentRecords[index] = recordData;
        changedRecords.push(recordData);
      }
    } else {
      // First time doing this exercise - track but do NOT celebrate
      currentRecords.push(recordData);
      changedRecords.push(recordData);
    }
  }

  if (changedRecords.length > 0) {
    await savePersonalRecords(currentRecords);

    syncPRsToCloud(changedRecords).catch(err => {
      console.error('Background PR sync failed:', err);
    });
  }

  return newPRs;
}

/**
 * Background cloud sync for PRs.
 * Respects the _syncBlocked flag to avoid racing with data clears.
 */
async function syncPRsToCloud(prsToSync) {
  if (_syncBlocked) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await Promise.all(prsToSync.map(async (pr) => {
      if (_syncBlocked) return;

      await supabase
        .from('personal_records')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise', pr.exercise);

      if (_syncBlocked) return;

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
 * Get all PRs grouped by exercise category
 * @returns {Promise<Object>} PRs grouped by category
 */
export async function getPRsByCategory() {
  const { EXERCISE_DATABASE } = await import('../constants/workoutTypes');
  const { loadCustomExercises } = await import('./customExercises');
  const records = await loadPersonalRecords();

  // Load custom exercises to get their categories
  const customExercises = await loadCustomExercises();
  const customExerciseMap = {};
  for (const ce of customExercises) {
    customExerciseMap[ce.name] = ce.category;
  }

  const grouped = {};

  for (const pr of records) {
    let category = 'Other';

    // First check built-in exercises
    for (const [cat, exercises] of Object.entries(EXERCISE_DATABASE)) {
      if (exercises.includes(pr.exercise)) {
        category = cat;
        break;
      }
    }

    // If not found in built-in, check custom exercises
    if (category === 'Other' && customExerciseMap[pr.exercise]) {
      category = customExerciseMap[pr.exercise];
    }

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(pr);
  }

  for (const category of Object.keys(grouped)) {
    // Sort by estimated 1RM (fallback to weight if no 1RM)
    grouped[category].sort((a, b) => (b.estimatedOneRepMax || b.weight) - (a.estimatedOneRepMax || a.weight));
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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
  const recentPRs = records.filter(pr => new Date(pr.date + 'T12:00:00') >= thirtyDaysAgo).length;

  const topExercise = records.reduce((best, current) =>
    current.weight > (best?.weight || 0) ? current : best
  , null);

  const totalWeight = records.reduce((sum, pr) => sum + pr.weight, 0);

  return {
    totalPRs: records.length,
    recentPRs,
    topExercise,
    totalWeight,
  };
}

/**
 * Clear all personal records (local + cloud).
 * Blocks background sync to prevent race conditions, deletes cloud first
 * so that loadPersonalRecords() can't re-cache stale data.
 */
export async function clearAllPersonalRecords() {
  _syncBlocked = true;

  try {
    // 1. Delete from cloud FIRST so loadPersonalRecords() can't re-cache
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('personal_records')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cloud PRs:', error);
      }
    }

    // 2. Set local to empty array (not remove — prevents stale fallback)
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify([]));

    // 3. Reset migration flag so it re-runs if sample data is loaded
    await AsyncStorage.removeItem(PR_MIGRATION_KEY);
  } catch (error) {
    console.error('Error clearing personal records:', error);
  } finally {
    // Unblock sync after a delay to let any in-flight operations settle
    setTimeout(() => { _syncBlocked = false; }, 2000);
  }
}

/**
 * Delete a personal record for a specific exercise
 * @param {string} exerciseName - Exercise to delete PR for
 */
export async function deletePR(exerciseName) {
  const records = await loadPersonalRecords();
  const filtered = records.filter(pr => pr.exercise !== exerciseName);
  await savePersonalRecords(filtered);

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
