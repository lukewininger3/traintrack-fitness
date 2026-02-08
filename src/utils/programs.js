import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProgramTemplate } from '../constants/programTemplates';
import { getAllBestOneRepMaxes } from './oneRepMax';

const ACTIVE_PROGRAM_KEY = '@traintrack_active_program';

/**
 * Active program data structure:
 * {
 *   programId: string,
 *   startDate: string (YYYY-MM-DD),
 *   currentWeek: number (1-based),
 *   currentDay: number (1-based, within the week's schedule),
 *   completedWorkouts: [{ week, day, date }],
 *   weeklyOverloadPercent: number (cumulative % added to weights),
 * }
 */

/**
 * Start a new program
 */
export async function startProgram(programId) {
  const template = getProgramTemplate(programId);
  if (!template) throw new Error('Program not found');

  const activeProgram = {
    programId,
    startDate: new Date().toISOString().split('T')[0],
    currentWeek: 1,
    currentDay: 1,
    completedWorkouts: [],
    weeklyOverloadPercent: 0,
  };

  await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(activeProgram));
  return activeProgram;
}

/**
 * Get the currently active program (if any)
 */
export async function getActiveProgram() {
  try {
    const json = await AsyncStorage.getItem(ACTIVE_PROGRAM_KEY);
    if (!json) return null;

    const program = JSON.parse(json);
    const template = getProgramTemplate(program.programId);
    if (!template) return null;

    return { ...program, template };
  } catch {
    return null;
  }
}

/**
 * Mark a workout day as completed and advance the pointer
 */
export async function completeWorkout(week, day) {
  const json = await AsyncStorage.getItem(ACTIVE_PROGRAM_KEY);
  if (!json) return null;

  const program = JSON.parse(json);
  const template = getProgramTemplate(program.programId);
  if (!template) return null;

  // Record completion
  program.completedWorkouts.push({
    week,
    day,
    date: new Date().toISOString().split('T')[0],
  });

  // Advance pointer
  const totalDays = template.schedule.length;

  if (day < totalDays) {
    // Next day in the week
    program.currentDay = day + 1;
  } else {
    // Advance to next week
    if (week < template.duration) {
      program.currentWeek = week + 1;
      program.currentDay = 1;
      // Progressive overload: add 2.5% each week
      program.weeklyOverloadPercent = (program.currentWeek - 1) * 2.5;
    }
    // If at the end of the program, keep the pointer where it is
  }

  await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(program));
  return { ...program, template };
}

/**
 * Get the next workout for the active program with exercise details.
 * Calculates target weights based on 1RM percentages + progressive overload.
 */
export async function getNextWorkout() {
  const active = await getActiveProgram();
  if (!active) return null;

  const { template, currentWeek, currentDay, weeklyOverloadPercent } = active;
  const daySchedule = template.schedule[currentDay - 1];
  if (!daySchedule) return null;

  // Get user's best 1RMs for weight calculations
  const best1RMs = await getAllBestOneRepMaxes();

  const exercises = daySchedule.exercises.map((ex) => {
    let targetWeight = null;

    if (ex.percentOf1RM && best1RMs[ex.name]) {
      // Calculate weight from 1RM percentage + weekly overload
      const base1RM = best1RMs[ex.name];
      const baseWeight = Math.round(base1RM * ex.percentOf1RM);
      const overloadMultiplier = 1 + weeklyOverloadPercent / 100;
      targetWeight = Math.round(baseWeight * overloadMultiplier / 5) * 5; // Round to nearest 5
    }

    return {
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({
        weight: targetWeight || 0,
        reps: ex.reps,
      })),
    };
  });

  return {
    programName: template.name,
    weekNumber: currentWeek,
    dayNumber: currentDay,
    dayName: daySchedule.name,
    exercises,
    totalWeeks: template.duration,
    isLastWorkout: currentWeek === template.duration && currentDay === template.schedule.length,
  };
}

/**
 * Cancel/stop the active program
 */
export async function cancelProgram() {
  await AsyncStorage.removeItem(ACTIVE_PROGRAM_KEY);
}

/**
 * Check if the program is complete
 */
export async function isProgramComplete() {
  const active = await getActiveProgram();
  if (!active) return false;

  const { template, completedWorkouts } = active;
  const totalWorkouts = template.duration * template.schedule.length;
  return completedWorkouts.length >= totalWorkouts;
}
