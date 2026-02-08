/**
 * Workout Generator
 *
 * Algorithmic workout generation using the existing exercise database.
 * Selects exercises based on target muscles, equipment, experience level,
 * and workout goal, then assigns sets/reps accordingly.
 */

import { EXERCISE_DATABASE } from '../constants/workoutTypes';
import { EXERCISE_MUSCLE_MAP } from './muscleGroups';
import {
  EXERCISE_EQUIPMENT_MAP,
  isCompound,
} from '../constants/exerciseMetadata';

// Set/rep schemes by workout goal and movement type
const SET_REP_SCHEMES = {
  strength: {
    compound:  { sets: 4, reps: 5 },
    isolation: { sets: 3, reps: 8 },
  },
  hypertrophy: {
    compound:  { sets: 4, reps: 8 },
    isolation: { sets: 3, reps: 12 },
  },
  endurance: {
    compound:  { sets: 3, reps: 15 },
    isolation: { sets: 3, reps: 20 },
  },
};

// Experience level modifiers
const EXPERIENCE_MODIFIERS = {
  beginner: {
    setsModifier: -1,
    maxCompoundRatio: 0.5,
    avoidDifficulty: ['advanced'],
  },
  intermediate: {
    setsModifier: 0,
    maxCompoundRatio: 0.6,
    avoidDifficulty: [],
  },
  advanced: {
    setsModifier: 1,
    maxCompoundRatio: 0.7,
    avoidDifficulty: [],
  },
};

// Duration (minutes) to recommended exercise count
const DURATION_EXERCISE_MAP = {
  20: 4,
  30: 5,
  45: 6,
  60: 8,
  75: 10,
  90: 12,
};

// Muscle group size ordering (larger groups first for exercise ordering)
const MUSCLE_SIZE_ORDER = [
  'quads', 'hamstrings', 'glutes', 'back', 'chest',
  'shoulders', 'triceps', 'biceps', 'calves', 'core',
];

/**
 * Convert duration in minutes to a recommended exercise count.
 */
export function durationToExerciseCount(durationMinutes) {
  return DURATION_EXERCISE_MAP[durationMinutes] || 6;
}

/**
 * Fisher-Yates shuffle (returns a new array).
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get the category for an exercise name from the database.
 */
function getCategoryForExercise(exerciseName) {
  for (const [category, exercises] of Object.entries(EXERCISE_DATABASE)) {
    if (exercises.includes(exerciseName)) return category;
  }
  return null;
}

/**
 * Get primary muscle groups for an exercise.
 */
function getPrimaryMuscles(exerciseName) {
  const mapping = EXERCISE_MUSCLE_MAP[exerciseName];
  if (mapping) return mapping.primary;
  return [];
}

/**
 * Get secondary muscle groups for an exercise.
 */
function getSecondaryMuscles(exerciseName) {
  const mapping = EXERCISE_MUSCLE_MAP[exerciseName];
  if (mapping) return mapping.secondary;
  return [];
}

/**
 * Check if an exercise matches the available equipment.
 */
function matchesEquipment(exerciseName, availableEquipment) {
  const meta = EXERCISE_EQUIPMENT_MAP[exerciseName];
  if (!meta) return true;
  return meta.equipment.some(eq => availableEquipment.includes(eq));
}

/**
 * Check if an exercise is appropriate for the experience level.
 */
function matchesDifficulty(exerciseName, experienceLevel) {
  const meta = EXERCISE_EQUIPMENT_MAP[exerciseName];
  if (!meta) return true;
  const modifiers = EXPERIENCE_MODIFIERS[experienceLevel] || EXPERIENCE_MODIFIERS.intermediate;
  return !modifiers.avoidDifficulty.includes(meta.difficulty);
}

/**
 * Check if an exercise targets any of the given muscle groups (primary).
 */
function targetsAnyMuscle(exerciseName, targetMuscles) {
  const primary = getPrimaryMuscles(exerciseName);
  return primary.some(m => targetMuscles.includes(m));
}

/**
 * Check if an exercise targets any of the given muscle groups (secondary).
 */
function targetsAnyMuscleSecondary(exerciseName, targetMuscles) {
  const secondary = getSecondaryMuscles(exerciseName);
  return secondary.some(m => targetMuscles.includes(m));
}

/**
 * Build a flat list of all exercises (excluding Cardio) with their category.
 */
function getAllStrengthExercises() {
  const exercises = [];
  for (const [category, names] of Object.entries(EXERCISE_DATABASE)) {
    if (category === 'Cardio') continue;
    for (const name of names) {
      exercises.push({ name, category });
    }
  }
  return exercises;
}

/**
 * Generate an auto-name for the workout based on target muscles and goal.
 */
export function getWorkoutName(targetMuscleGroups, workoutGoal) {
  const goalLabel = workoutGoal.charAt(0).toUpperCase() + workoutGoal.slice(1);

  // Check for common split patterns
  const pushMuscles = ['chest', 'shoulders', 'triceps'];
  const pullMuscles = ['back', 'biceps'];
  const legMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
  const upperMuscles = [...pushMuscles, ...pullMuscles];

  const hasPush = pushMuscles.some(m => targetMuscleGroups.includes(m));
  const hasPull = pullMuscles.some(m => targetMuscleGroups.includes(m));
  const hasLegs = legMuscles.some(m => targetMuscleGroups.includes(m));

  const isPush = targetMuscleGroups.every(m => pushMuscles.includes(m)) && hasPush;
  const isPull = targetMuscleGroups.every(m => pullMuscles.includes(m)) && hasPull;
  const isLegs = targetMuscleGroups.every(m => [...legMuscles, 'core'].includes(m)) && hasLegs;
  const isUpper = targetMuscleGroups.every(m => upperMuscles.includes(m)) && (hasPush || hasPull);

  if (targetMuscleGroups.length >= 7) return `Full Body ${goalLabel}`;
  if (isPush) return `Push ${goalLabel}`;
  if (isPull) return `Pull ${goalLabel}`;
  if (isLegs) return `Leg Day ${goalLabel}`;
  if (isUpper) return `Upper Body ${goalLabel}`;
  if (hasPush && hasLegs && !hasPull) return `Push + Legs ${goalLabel}`;
  if (hasPull && hasLegs && !hasPush) return `Pull + Legs ${goalLabel}`;

  // Fall back to listing 1-2 muscle group names
  if (targetMuscleGroups.length === 1) {
    const label = targetMuscleGroups[0].charAt(0).toUpperCase() + targetMuscleGroups[0].slice(1);
    return `${label} ${goalLabel}`;
  }
  if (targetMuscleGroups.length === 2) {
    const labels = targetMuscleGroups.map(m => m.charAt(0).toUpperCase() + m.slice(1));
    return `${labels[0]} & ${labels[1]} ${goalLabel}`;
  }

  return `Custom ${goalLabel}`;
}

/**
 * Main generation function.
 *
 * @param {Object} input
 * @param {string[]} input.targetMuscleGroups - e.g. ['chest', 'triceps', 'shoulders']
 * @param {string} input.experienceLevel - 'beginner' | 'intermediate' | 'advanced'
 * @param {string[]} input.availableEquipment - e.g. ['barbell', 'dumbbell', 'bodyweight']
 * @param {number} input.exerciseCount - Number of exercises to generate (3-12)
 * @param {string} input.workoutGoal - 'strength' | 'hypertrophy' | 'endurance'
 * @returns {{ name: string, type: string, exercises: Object[] }}
 */
export function generateWorkout(input) {
  const {
    targetMuscleGroups,
    experienceLevel = 'intermediate',
    availableEquipment,
    exerciseCount = 6,
    workoutGoal = 'hypertrophy',
  } = input;

  const modifiers = EXPERIENCE_MODIFIERS[experienceLevel] || EXPERIENCE_MODIFIERS.intermediate;
  const schemes = SET_REP_SCHEMES[workoutGoal] || SET_REP_SCHEMES.hypertrophy;

  // 1. Build candidate pool
  const allExercises = getAllStrengthExercises();

  let candidates = allExercises.filter(ex => {
    if (!matchesEquipment(ex.name, availableEquipment)) return false;
    if (!matchesDifficulty(ex.name, experienceLevel)) return false;
    if (!targetsAnyMuscle(ex.name, targetMuscleGroups)) return false;
    return true;
  });

  // 2. Partition into compound and isolation
  let compounds = candidates.filter(ex => isCompound(ex.name));
  let isolations = candidates.filter(ex => !isCompound(ex.name));

  // 3. Determine compound/isolation split
  const maxCompounds = Math.floor(exerciseCount * modifiers.maxCompoundRatio);
  let compoundSlots = Math.min(maxCompounds, compounds.length);
  let isolationSlots = exerciseCount - compoundSlots;

  // If not enough isolations, give extra slots to compounds
  if (isolationSlots > isolations.length) {
    const extra = isolationSlots - isolations.length;
    isolationSlots = isolations.length;
    compoundSlots = Math.min(compoundSlots + extra, compounds.length);
  }

  // 4. Distribute across muscle groups proportionally
  const muscleWeights = {};
  targetMuscleGroups.forEach(m => { muscleWeights[m] = 1; });
  const totalWeight = targetMuscleGroups.length;

  // Calculate how many exercises per muscle group
  const muscleAllocations = {};
  let allocated = 0;
  targetMuscleGroups.forEach((m, i) => {
    if (i === targetMuscleGroups.length - 1) {
      muscleAllocations[m] = exerciseCount - allocated;
    } else {
      const count = Math.max(1, Math.round((muscleWeights[m] / totalWeight) * exerciseCount));
      muscleAllocations[m] = count;
      allocated += count;
    }
  });

  // 5. Select exercises per muscle group
  const selected = [];
  const usedNames = new Set();
  let compoundsRemaining = compoundSlots;

  // Sort muscle groups by allocation (descending) for priority
  const sortedMuscles = Object.entries(muscleAllocations)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  for (const muscle of sortedMuscles) {
    const needed = muscleAllocations[muscle];
    let pickedForGroup = 0;

    // Get compounds for this muscle group
    const groupCompounds = shuffle(
      compounds.filter(ex =>
        getPrimaryMuscles(ex.name).includes(muscle) && !usedNames.has(ex.name)
      )
    );

    // Pick compounds first
    for (const ex of groupCompounds) {
      if (pickedForGroup >= needed || compoundsRemaining <= 0) break;
      selected.push(ex);
      usedNames.add(ex.name);
      pickedForGroup++;
      compoundsRemaining--;
    }

    // Fill with isolations
    const groupIsolations = shuffle(
      isolations.filter(ex =>
        getPrimaryMuscles(ex.name).includes(muscle) && !usedNames.has(ex.name)
      )
    );

    for (const ex of groupIsolations) {
      if (pickedForGroup >= needed) break;
      selected.push(ex);
      usedNames.add(ex.name);
      pickedForGroup++;
    }
  }

  // 6. Handle shortfall — pull from secondary muscle contributors
  if (selected.length < exerciseCount) {
    const secondaryCandidates = shuffle(
      allExercises.filter(ex =>
        !usedNames.has(ex.name) &&
        matchesEquipment(ex.name, availableEquipment) &&
        matchesDifficulty(ex.name, experienceLevel) &&
        targetsAnyMuscleSecondary(ex.name, targetMuscleGroups)
      )
    );

    for (const ex of secondaryCandidates) {
      if (selected.length >= exerciseCount) break;
      selected.push(ex);
      usedNames.add(ex.name);
    }
  }

  // Still short? Relax equipment filter
  if (selected.length < exerciseCount) {
    const relaxed = shuffle(
      allExercises.filter(ex =>
        !usedNames.has(ex.name) &&
        matchesDifficulty(ex.name, experienceLevel) &&
        targetsAnyMuscle(ex.name, targetMuscleGroups)
      )
    );

    for (const ex of relaxed) {
      if (selected.length >= exerciseCount) break;
      selected.push(ex);
      usedNames.add(ex.name);
    }
  }

  // 7. Order exercises: compounds first (large→small), then isolations
  selected.sort((a, b) => {
    const aCompound = isCompound(a.name);
    const bCompound = isCompound(b.name);

    // Compounds first
    if (aCompound && !bCompound) return -1;
    if (!aCompound && bCompound) return 1;

    // Within same type, order by muscle group size
    const aPrimary = getPrimaryMuscles(a.name);
    const bPrimary = getPrimaryMuscles(b.name);
    const aOrder = Math.min(...aPrimary.map(m => MUSCLE_SIZE_ORDER.indexOf(m)).filter(i => i >= 0), 99);
    const bOrder = Math.min(...bPrimary.map(m => MUSCLE_SIZE_ORDER.indexOf(m)).filter(i => i >= 0), 99);
    return aOrder - bOrder;
  });

  // 8. Assign sets and reps
  const exercises = selected.map(ex => {
    const type = isCompound(ex.name) ? 'compound' : 'isolation';
    const scheme = schemes[type];
    const sets = Math.max(2, scheme.sets + modifiers.setsModifier);

    return {
      name: ex.name,
      category: ex.category,
      sets,
      reps: scheme.reps,
      primaryMuscles: getPrimaryMuscles(ex.name),
      isCompound: isCompound(ex.name),
    };
  });

  // 9. Generate name
  const name = getWorkoutName(targetMuscleGroups, workoutGoal);

  return {
    name,
    type: 'Strength',
    exercises,
  };
}

export { SET_REP_SCHEMES, EXPERIENCE_MODIFIERS, DURATION_EXERCISE_MAP };
