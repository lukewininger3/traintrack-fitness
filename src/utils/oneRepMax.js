import { loadWorkouts } from './storage';
import { calculateOneRepMax } from './personalRecords';

/**
 * Get the best estimated 1RM for a specific exercise across all workouts.
 * Returns the highest estimated 1RM from any set in any workout.
 * @param {string} exerciseName
 * @returns {Promise<{ estimated1RM: number, weight: number, reps: number, date: string } | null>}
 */
export async function getBestOneRepMax(exerciseName) {
  const workouts = await loadWorkouts({ silent: true });
  let best = null;

  for (const workout of workouts) {
    if (!workout.exercises) continue;
    for (const exercise of workout.exercises) {
      if (exercise.name !== exerciseName) continue;
      for (const set of exercise.sets || []) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (weight <= 0 || reps <= 0) continue;

        const estimated1RM = calculateOneRepMax(weight, reps);
        if (!best || estimated1RM > best.estimated1RM) {
          best = { estimated1RM, weight, reps, date: workout.date };
        }
      }
    }
  }

  return best;
}

/**
 * Get 1RM history for an exercise over time (best 1RM per workout date).
 * Returns sorted array for charting.
 * @param {string} exerciseName
 * @param {Array} workouts - Pre-loaded workouts array (optional, will load if not provided)
 * @returns {Promise<Array<{ date: string, estimated1RM: number, weight: number, reps: number }>>}
 */
export async function getOneRepMaxHistory(exerciseName, workouts) {
  if (!workouts) {
    workouts = await loadWorkouts({ silent: true });
  }

  const history = [];

  for (const workout of workouts) {
    if (!workout.exercises) continue;
    for (const exercise of workout.exercises) {
      if (exercise.name !== exerciseName) continue;

      let bestInWorkout = null;
      for (const set of exercise.sets || []) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (weight <= 0 || reps <= 0) continue;

        const estimated1RM = calculateOneRepMax(weight, reps);
        if (!bestInWorkout || estimated1RM > bestInWorkout.estimated1RM) {
          bestInWorkout = { estimated1RM, weight, reps };
        }
      }

      if (bestInWorkout) {
        history.push({
          date: workout.date,
          ...bestInWorkout,
        });
      }
    }
  }

  // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
  history.sort((a, b) => new Date(a.date + 'T12:00:00') - new Date(b.date + 'T12:00:00'));
  return history;
}

/**
 * Get a map of best estimated 1RM for each exercise the user has done.
 * Useful for showing badges on exercise cards.
 * @returns {Promise<Object<string, number>>} Map of exerciseName -> best estimated 1RM
 */
export async function getAllBestOneRepMaxes() {
  const workouts = await loadWorkouts({ silent: true });
  const bestMap = {};

  for (const workout of workouts) {
    if (!workout.exercises) continue;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets || []) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (weight <= 0 || reps <= 0) continue;

        const estimated1RM = calculateOneRepMax(weight, reps);
        if (!bestMap[exercise.name] || estimated1RM > bestMap[exercise.name]) {
          bestMap[exercise.name] = estimated1RM;
        }
      }
    }
  }

  return bestMap;
}
