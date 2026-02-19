import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWorkouts } from './storage';
import { loadPersonalRecords } from './personalRecords';
import { EXERCISE_DATABASE } from '../constants/workoutTypes';

const RECAP_DISMISSED_KEY = '@traintrack_recap_dismissed';

/**
 * Parse a YYYY-MM-DD string as local date (avoiding timezone issues)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone
 */
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the Monday of the current week (ISO week start)
 */
function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a string key for a week (YYYY-MM-DD of Monday)
 */
function getWeekKey(date = new Date()) {
  const monday = getMonday(date);
  return monday.toISOString().split('T')[0];
}

/**
 * Generate a weekly recap for the previous week.
 * Returns null if there's no data or the recap has been dismissed.
 */
export async function generateWeeklyRecap() {
  try {
    // Get current and previous week boundaries
    const now = new Date();
    const thisMonday = getMonday(now);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(prevSunday.getDate() - 1);
    prevSunday.setHours(23, 59, 59, 999);

    // Week before that (for comparison)
    const twoWeeksAgo = new Date(prevMonday);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    const weekKey = getWeekKey(prevMonday);

    // Check if already dismissed
    const dismissed = await AsyncStorage.getItem(RECAP_DISMISSED_KEY);
    if (dismissed === weekKey) return null;

    const allWorkouts = await loadWorkouts({ silent: true });
    if (!allWorkouts || allWorkouts.length === 0) return null;

    // Filter workouts for the previous week
    const weekWorkouts = allWorkouts.filter(w => {
      const d = parseLocalDate(w.date);
      return d >= prevMonday && d <= prevSunday;
    });

    if (weekWorkouts.length === 0) return null;

    // Filter workouts for the week before (comparison)
    const priorWeekWorkouts = allWorkouts.filter(w => {
      const d = parseLocalDate(w.date);
      return d >= twoWeeksAgo && d < prevMonday;
    });

    // Total workouts
    const totalWorkouts = weekWorkouts.length;
    const priorWeekTotal = priorWeekWorkouts.length;

    // Days active (unique days with workouts)
    const uniqueDays = new Set(weekWorkouts.map(w => w.date.split('T')[0]));
    const daysActive = uniqueDays.size;

    // Total volume (weight × reps)
    let totalVolume = 0;
    let priorVolume = 0;

    const calculateVolume = (workouts) => {
      let vol = 0;
      for (const w of workouts) {
        for (const ex of w.exercises || []) {
          for (const set of ex.sets || []) {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            if (weight > 0 && reps > 0) vol += weight * reps;
          }
        }
      }
      return vol;
    };

    totalVolume = calculateVolume(weekWorkouts);
    priorVolume = calculateVolume(priorWeekWorkouts);

    // PRs set this week
    const prs = await loadPersonalRecords();
    const weekPRs = prs.filter(pr => {
      const d = parseLocalDate(pr.date);
      return d >= prevMonday && d <= prevSunday;
    });

    // Most trained muscle groups
    const muscleGroupCounts = {};
    for (const w of weekWorkouts) {
      for (const ex of w.exercises || []) {
        for (const [cat, exercises] of Object.entries(EXERCISE_DATABASE)) {
          if (exercises.includes(ex.name)) {
            muscleGroupCounts[cat] = (muscleGroupCounts[cat] || 0) + 1;
            break;
          }
        }
      }
    }

    const topMuscleGroups = Object.entries(muscleGroupCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Workout type breakdown
    const workoutTypeCounts = {};
    for (const w of weekWorkouts) {
      const type = w.type || 'Other';
      workoutTypeCounts[type] = (workoutTypeCounts[type] || 0) + 1;
    }

    // Workout change percentage
    const workoutChange = priorWeekTotal > 0
      ? Math.round(((totalWorkouts - priorWeekTotal) / priorWeekTotal) * 100)
      : null;

    // Volume change percentage
    const volumeChange = priorVolume > 0
      ? Math.round(((totalVolume - priorVolume) / priorVolume) * 100)
      : null;

    return {
      weekKey,
      weekLabel: `${prevMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${prevSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      totalWorkouts,
      daysActive,
      workoutChange,
      totalVolume: Math.round(totalVolume),
      volumeChange,
      prsCount: weekPRs.length,
      prs: weekPRs.slice(0, 3),
      topMuscleGroups,
      workoutTypes: workoutTypeCounts,
    };
  } catch (error) {
    console.error('Error generating weekly recap:', error);
    return null;
  }
}

/**
 * Dismiss the weekly recap for a given week key
 */
export async function dismissWeeklyRecap(weekKey) {
  try {
    await AsyncStorage.setItem(RECAP_DISMISSED_KEY, weekKey);
  } catch (error) {
    console.error('Error dismissing weekly recap:', error);
  }
}

/**
 * Generate weekly stats for the current week (always available, for analytics tab).
 * Returns stats even if there's no data.
 */
export async function getCurrentWeekStats() {
  try {
    const now = new Date();
    const thisMonday = getMonday(now);
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisSunday.getDate() + 6);
    thisSunday.setHours(23, 59, 59, 999);

    // Previous week for comparison
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(prevSunday.getDate() - 1);
    prevSunday.setHours(23, 59, 59, 999);

    const allWorkouts = await loadWorkouts({ silent: true });
    const workoutsData = allWorkouts || [];

    // Current week workouts
    const weekWorkouts = workoutsData.filter(w => {
      const d = parseLocalDate(w.date);
      return d >= thisMonday && d <= thisSunday;
    });

    // Previous week workouts (for comparison)
    const prevWeekWorkouts = workoutsData.filter(w => {
      const d = parseLocalDate(w.date);
      return d >= prevMonday && d <= prevSunday;
    });

    // Total workouts
    const totalWorkouts = weekWorkouts.length;
    const prevWeekTotal = prevWeekWorkouts.length;

    // Days active
    const uniqueDays = new Set(weekWorkouts.map(w => w.date.split('T')[0]));
    const daysActive = uniqueDays.size;

    // PRs this week
    const prs = await loadPersonalRecords();
    const weekPRs = prs.filter(pr => {
      const d = parseLocalDate(pr.date);
      return d >= thisMonday && d <= thisSunday;
    });

    // Workout type breakdown
    const workoutTypeCounts = {};
    for (const w of weekWorkouts) {
      const type = w.type || 'Other';
      workoutTypeCounts[type] = (workoutTypeCounts[type] || 0) + 1;
    }

    // Calculate volume (weight × reps)
    const calculateVolume = (workouts) => {
      let vol = 0;
      for (const w of workouts) {
        for (const ex of w.exercises || []) {
          for (const set of ex.sets || []) {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            if (weight > 0 && reps > 0) vol += weight * reps;
          }
        }
      }
      return vol;
    };

    const totalVolume = calculateVolume(weekWorkouts);
    const prevVolume = calculateVolume(prevWeekWorkouts);

    // Workout change percentage
    const workoutChange = prevWeekTotal > 0
      ? Math.round(((totalWorkouts - prevWeekTotal) / prevWeekTotal) * 100)
      : null;

    // Volume change percentage
    const volumeChange = prevVolume > 0
      ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100)
      : null;

    return {
      weekLabel: `${thisMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${thisSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      totalWorkouts,
      daysActive,
      workoutChange,
      prsCount: weekPRs.length,
      workoutTypes: workoutTypeCounts,
      totalVolume: Math.round(totalVolume),
      volumeChange,
    };
  } catch (error) {
    console.error('Error generating current week stats:', error);
    return {
      weekLabel: 'This Week',
      totalWorkouts: 0,
      daysActive: 0,
      workoutChange: null,
      prsCount: 0,
      workoutTypes: {},
    };
  }
}
