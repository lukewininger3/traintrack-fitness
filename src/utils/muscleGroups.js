/**
 * Muscle Group Utilities
 *
 * Maps exercises to muscle groups for tracking training coverage and recovery.
 */

// Standard muscle groups
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

// Display names for muscle groups
export const MUSCLE_GROUP_LABELS = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

// Colors for each muscle group (using design system compatible colors)
export const MUSCLE_GROUP_COLORS = {
  chest: '#FF6B35', // Coral
  back: '#00D4FF', // Cyan
  shoulders: '#BFFF00', // Lime
  biceps: '#FF3B8B', // Pink
  triceps: '#9B59B6', // Purple
  quads: '#00FF88', // Green
  hamstrings: '#FFD600', // Yellow
  glutes: '#FF8C00', // Orange
  calves: '#00CED1', // Dark Cyan
  core: '#FF6B6B', // Light Red
};

// Map exercises to primary and secondary muscles
// Primary muscles: main muscles worked
// Secondary muscles: supporting muscles engaged
export const EXERCISE_MUSCLE_MAP = {
  // Chest exercises
  'Bench Press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'Incline Bench Press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'Decline Bench Press': { primary: ['chest'], secondary: ['triceps'] },
  'Dumbbell Bench Press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'Incline Dumbbell Press': { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  'Dumbbell Flyes': { primary: ['chest'], secondary: [] },
  'Cable Flyes': { primary: ['chest'], secondary: [] },
  'Chest Press Machine': { primary: ['chest'], secondary: ['triceps'] },
  'Push-Ups': { primary: ['chest'], secondary: ['triceps', 'shoulders', 'core'] },
  'Dips': { primary: ['chest', 'triceps'], secondary: ['shoulders'] },
  'Pec Deck': { primary: ['chest'], secondary: [] },

  // Back exercises
  'Deadlift': { primary: ['back', 'hamstrings', 'glutes'], secondary: ['quads', 'core'] },
  'Barbell Row': { primary: ['back'], secondary: ['biceps'] },
  'Dumbbell Row': { primary: ['back'], secondary: ['biceps'] },
  'T-Bar Row': { primary: ['back'], secondary: ['biceps'] },
  'Seated Cable Row': { primary: ['back'], secondary: ['biceps'] },
  'Lat Pulldown': { primary: ['back'], secondary: ['biceps'] },
  'Pull-Ups': { primary: ['back'], secondary: ['biceps', 'core'] },
  'Chin-Ups': { primary: ['back', 'biceps'], secondary: [] },
  'Face Pulls': { primary: ['back', 'shoulders'], secondary: [] },
  'Shrugs': { primary: ['back'], secondary: ['shoulders'] },
  'Hyperextensions': { primary: ['back', 'glutes'], secondary: ['hamstrings'] },

  // Shoulder exercises
  'Overhead Press': { primary: ['shoulders'], secondary: ['triceps', 'core'] },
  'Dumbbell Shoulder Press': { primary: ['shoulders'], secondary: ['triceps'] },
  'Arnold Press': { primary: ['shoulders'], secondary: ['triceps'] },
  'Lateral Raises': { primary: ['shoulders'], secondary: [] },
  'Front Raises': { primary: ['shoulders'], secondary: [] },
  'Rear Delt Flyes': { primary: ['shoulders'], secondary: ['back'] },
  'Upright Rows': { primary: ['shoulders'], secondary: ['biceps'] },
  'Cable Lateral Raises': { primary: ['shoulders'], secondary: [] },

  // Biceps exercises
  'Barbell Curl': { primary: ['biceps'], secondary: [] },
  'Dumbbell Curl': { primary: ['biceps'], secondary: [] },
  'Hammer Curl': { primary: ['biceps'], secondary: [] },
  'Preacher Curl': { primary: ['biceps'], secondary: [] },
  'Concentration Curl': { primary: ['biceps'], secondary: [] },
  'Cable Curl': { primary: ['biceps'], secondary: [] },
  'Incline Dumbbell Curl': { primary: ['biceps'], secondary: [] },
  'Spider Curl': { primary: ['biceps'], secondary: [] },
  '21s': { primary: ['biceps'], secondary: [] },

  // Triceps exercises
  'Tricep Pushdown': { primary: ['triceps'], secondary: [] },
  'Overhead Tricep Extension': { primary: ['triceps'], secondary: [] },
  'Skull Crushers': { primary: ['triceps'], secondary: [] },
  'Close-Grip Bench Press': { primary: ['triceps'], secondary: ['chest'] },
  'Tricep Dips': { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  'Cable Overhead Extension': { primary: ['triceps'], secondary: [] },
  'Diamond Push-Ups': { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  'Kickbacks': { primary: ['triceps'], secondary: [] },

  // Leg exercises
  'Squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  'Front Squat': { primary: ['quads'], secondary: ['glutes', 'core'] },
  'Leg Press': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Romanian Deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  'Leg Curl': { primary: ['hamstrings'], secondary: [] },
  'Leg Extension': { primary: ['quads'], secondary: [] },
  'Walking Lunges': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Bulgarian Split Squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Calf Raises': { primary: ['calves'], secondary: [] },
  'Goblet Squat': { primary: ['quads', 'glutes'], secondary: ['core'] },
  'Hack Squat': { primary: ['quads'], secondary: ['glutes'] },
  'Step-Ups': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },

  // Core exercises
  'Plank': { primary: ['core'], secondary: ['shoulders'] },
  'Side Plank': { primary: ['core'], secondary: [] },
  'Crunches': { primary: ['core'], secondary: [] },
  'Bicycle Crunches': { primary: ['core'], secondary: [] },
  'Russian Twists': { primary: ['core'], secondary: [] },
  'Leg Raises': { primary: ['core'], secondary: [] },
  'Ab Wheel': { primary: ['core'], secondary: ['shoulders'] },
  'Cable Crunches': { primary: ['core'], secondary: [] },
  'Mountain Climbers': { primary: ['core'], secondary: ['shoulders'] },
  'Hanging Knee Raises': { primary: ['core'], secondary: [] },
};

// Category to primary muscle group mapping (for custom exercises or unknown exercises)
export const CATEGORY_MUSCLE_MAP = {
  Chest: ['chest'],
  Back: ['back'],
  Shoulders: ['shoulders'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  Core: ['core'],
  Cardio: [], // Cardio doesn't target specific strength muscles
};

/**
 * Get muscle groups for an exercise
 * @param {string} exerciseName - Name of the exercise
 * @param {string} category - Category of the exercise (fallback)
 * @returns {Object} { primary: string[], secondary: string[] }
 */
export function getMuscleGroups(exerciseName, category = null) {
  // Check exact match first
  if (EXERCISE_MUSCLE_MAP[exerciseName]) {
    return EXERCISE_MUSCLE_MAP[exerciseName];
  }

  // Fallback to category mapping
  if (category && CATEGORY_MUSCLE_MAP[category]) {
    return {
      primary: CATEGORY_MUSCLE_MAP[category],
      secondary: [],
    };
  }

  // Default - return empty
  return { primary: [], secondary: [] };
}

/**
 * Analyze muscle group coverage from workout data
 * @param {Array} workouts - Array of workout objects
 * @param {number} days - Number of days to analyze (default: 7)
 * @returns {Object} Muscle group training data
 */
export function analyzeMuscleGroupCoverage(workouts, days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const muscleData = {};
  MUSCLE_GROUPS.forEach(muscle => {
    muscleData[muscle] = {
      count: 0,
      lastTrainedDate: null,
      daysSinceTraining: null,
    };
  });

  // Filter workouts within date range
  const recentWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate >= cutoffDate;
  });

  // Analyze each workout
  recentWorkouts.forEach(workout => {
    if (!workout.exercises) return;

    workout.exercises.forEach(exercise => {
      const muscles = getMuscleGroups(exercise.name);
      const workoutDate = new Date(workout.date);

      // Count primary muscles
      muscles.primary.forEach(muscle => {
        if (muscleData[muscle]) {
          muscleData[muscle].count += 1;
          if (!muscleData[muscle].lastTrainedDate || workoutDate > new Date(muscleData[muscle].lastTrainedDate)) {
            muscleData[muscle].lastTrainedDate = workout.date;
          }
        }
      });

      // Count secondary muscles (weighted less)
      muscles.secondary.forEach(muscle => {
        if (muscleData[muscle]) {
          muscleData[muscle].count += 0.5;
          if (!muscleData[muscle].lastTrainedDate || workoutDate > new Date(muscleData[muscle].lastTrainedDate)) {
            muscleData[muscle].lastTrainedDate = workout.date;
          }
        }
      });
    });
  });

  // Calculate days since last training
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Object.keys(muscleData).forEach(muscle => {
    if (muscleData[muscle].lastTrainedDate) {
      const lastDate = new Date(muscleData[muscle].lastTrainedDate);
      lastDate.setHours(0, 0, 0, 0);
      muscleData[muscle].daysSinceTraining = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }
  });

  return muscleData;
}

/**
 * Get recovery status for a muscle group
 * @param {number} daysSince - Days since last training
 * @returns {string} 'recovered' | 'recent' | 'fatigued' | 'untrained'
 */
export function getRecoveryStatus(daysSince) {
  if (daysSince === null) return 'untrained';
  if (daysSince >= 3) return 'recovered'; // Green - fully recovered
  if (daysSince >= 1) return 'recent'; // Yellow - recently trained
  return 'fatigued'; // Red - needs rest
}

/**
 * Get all muscles trained in a workout
 * @param {Object} workout - Workout object with exercises
 * @returns {Set} Set of muscle group names
 */
export function getWorkoutMuscles(workout) {
  const muscles = new Set();

  if (!workout.exercises) return muscles;

  workout.exercises.forEach(exercise => {
    const { primary, secondary } = getMuscleGroups(exercise.name);
    primary.forEach(m => muscles.add(m));
    secondary.forEach(m => muscles.add(m));
  });

  return muscles;
}
