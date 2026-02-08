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
export const EXERCISE_MUSCLE_MAP = {
  // ── Chest ──
  'BB Bench Press':         { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'DB Bench Press':         { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'SM Bench Press':         { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'BB Incline Bench Press': { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  'DB Incline Bench Press': { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  'SM Incline Bench Press': { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  'BB Decline Bench Press': { primary: ['chest'], secondary: ['triceps'] },
  'DB Decline Bench Press': { primary: ['chest'], secondary: ['triceps'] },
  'DB Flyes':               { primary: ['chest'], secondary: [] },
  'Cable Flyes':            { primary: ['chest'], secondary: [] },
  'Chest Press Machine':    { primary: ['chest'], secondary: ['triceps'] },
  'Pec Deck':               { primary: ['chest'], secondary: [] },
  'Push-Ups':               { primary: ['chest'], secondary: ['triceps', 'shoulders', 'core'] },
  'Dips':                   { primary: ['chest', 'triceps'], secondary: ['shoulders'] },
  'Landmine Press':         { primary: ['chest', 'shoulders'], secondary: ['triceps', 'core'] },
  'DB Pullover':            { primary: ['chest'], secondary: ['back'] },

  // ── Back ──
  'BB Deadlift':            { primary: ['back', 'hamstrings', 'glutes'], secondary: ['quads', 'core'] },
  'BB Bent Over Row':       { primary: ['back'], secondary: ['biceps'] },
  'DB Row':                 { primary: ['back'], secondary: ['biceps'] },
  'T-Bar Row':              { primary: ['back'], secondary: ['biceps'] },
  'Seated Cable Row':       { primary: ['back'], secondary: ['biceps'] },
  'Lat Pulldown':           { primary: ['back'], secondary: ['biceps'] },
  'Pull-Ups':               { primary: ['back'], secondary: ['biceps', 'core'] },
  'Chin-Ups':               { primary: ['back', 'biceps'], secondary: [] },
  'Face Pulls':             { primary: ['back', 'shoulders'], secondary: [] },
  'BB Shrugs':              { primary: ['back'], secondary: ['shoulders'] },
  'DB Shrugs':              { primary: ['back'], secondary: ['shoulders'] },
  'SM Shrugs':              { primary: ['back'], secondary: ['shoulders'] },
  'Hyperextensions':        { primary: ['back', 'glutes'], secondary: ['hamstrings'] },
  'Pendlay Row':            { primary: ['back'], secondary: ['biceps', 'core'] },
  'Chest Supported DB Row': { primary: ['back'], secondary: ['biceps'] },
  'Cable Pullover':         { primary: ['back'], secondary: ['chest'] },
  'Straight Arm Pulldown':  { primary: ['back'], secondary: [] },

  // ── Shoulders ──
  'BB Overhead Press':      { primary: ['shoulders'], secondary: ['triceps', 'core'] },
  'DB Overhead Press':      { primary: ['shoulders'], secondary: ['triceps', 'core'] },
  'SM Overhead Press':      { primary: ['shoulders'], secondary: ['triceps'] },
  'Arnold Press':           { primary: ['shoulders'], secondary: ['triceps'] },
  'DB Lateral Raises':      { primary: ['shoulders'], secondary: [] },
  'Cable Lateral Raises':   { primary: ['shoulders'], secondary: [] },
  'DB Front Raises':        { primary: ['shoulders'], secondary: [] },
  'DB Rear Delt Flyes':     { primary: ['shoulders'], secondary: ['back'] },
  'Cable Rear Delt Flyes':  { primary: ['shoulders'], secondary: ['back'] },
  'Reverse Pec Deck':       { primary: ['shoulders'], secondary: ['back'] },
  'BB Upright Row':         { primary: ['shoulders'], secondary: ['biceps'] },
  'DB Upright Row':         { primary: ['shoulders'], secondary: ['biceps'] },
  'Machine Shoulder Press': { primary: ['shoulders'], secondary: ['triceps'] },

  // ── Biceps ──
  'BB Curl':                { primary: ['biceps'], secondary: [] },
  'EZ Bar Curl':            { primary: ['biceps'], secondary: [] },
  'DB Curl':                { primary: ['biceps'], secondary: [] },
  'DB Hammer Curl':         { primary: ['biceps'], secondary: [] },
  'BB Preacher Curl':       { primary: ['biceps'], secondary: [] },
  'DB Preacher Curl':       { primary: ['biceps'], secondary: [] },
  'DB Concentration Curl':  { primary: ['biceps'], secondary: [] },
  'Cable Curl':             { primary: ['biceps'], secondary: [] },
  'DB Incline Curl':        { primary: ['biceps'], secondary: [] },
  'Spider Curl':            { primary: ['biceps'], secondary: [] },
  'Reverse Curl':           { primary: ['biceps'], secondary: [] },
  'Machine Curl':           { primary: ['biceps'], secondary: [] },

  // ── Triceps ──
  'Cable Rope Pushdown':         { primary: ['triceps'], secondary: [] },
  'Cable Straight Bar Pushdown': { primary: ['triceps'], secondary: [] },
  'BB Skull Crushers':           { primary: ['triceps'], secondary: [] },
  'DB Skull Crushers':           { primary: ['triceps'], secondary: [] },
  'BB Close-Grip Bench Press':   { primary: ['triceps'], secondary: ['chest'] },
  'SM Close-Grip Bench Press':   { primary: ['triceps'], secondary: ['chest'] },
  'Tricep Dips':                 { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  'Cable Overhead Extension':    { primary: ['triceps'], secondary: [] },
  'DB Overhead Tricep Extension': { primary: ['triceps'], secondary: [] },
  'DB Kickbacks':                { primary: ['triceps'], secondary: [] },
  'Diamond Push-Ups':            { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  'Machine Tricep Extension':    { primary: ['triceps'], secondary: [] },

  // ── Legs ──
  'BB Back Squat':          { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  'BB Front Squat':         { primary: ['quads'], secondary: ['glutes', 'core'] },
  'SM Squat':               { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Goblet Squat':           { primary: ['quads', 'glutes'], secondary: ['core'] },
  'Hack Squat':             { primary: ['quads'], secondary: ['glutes'] },
  'Leg Press':              { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'BB Romanian Deadlift':   { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  'DB Romanian Deadlift':   { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  'BB Sumo Deadlift':       { primary: ['quads', 'glutes', 'hamstrings'], secondary: ['back', 'core'] },
  'Leg Curl':               { primary: ['hamstrings'], secondary: [] },
  'Leg Extension':          { primary: ['quads'], secondary: [] },
  'DB Walking Lunges':      { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'BB Walking Lunges':      { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  'SM Lunges':              { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Bulgarian Split Squat':  { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'Standing Calf Raises':   { primary: ['calves'], secondary: [] },
  'Seated Calf Raises':     { primary: ['calves'], secondary: [] },
  'SM Calf Raises':         { primary: ['calves'], secondary: [] },
  'DB Step-Ups':            { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'BB Hip Thrust':          { primary: ['glutes'], secondary: ['hamstrings', 'core'] },
  'SM Hip Thrust':          { primary: ['glutes'], secondary: ['hamstrings'] },
  'Good Mornings':          { primary: ['hamstrings', 'glutes'], secondary: ['back', 'core'] },

  // ── Core ──
  'Plank':                  { primary: ['core'], secondary: ['shoulders'] },
  'Side Plank':             { primary: ['core'], secondary: [] },
  'Crunches':               { primary: ['core'], secondary: [] },
  'Bicycle Crunches':       { primary: ['core'], secondary: [] },
  'Russian Twists':         { primary: ['core'], secondary: [] },
  'Hanging Leg Raises':     { primary: ['core'], secondary: [] },
  'Ab Wheel':               { primary: ['core'], secondary: ['shoulders'] },
  'Cable Crunches':         { primary: ['core'], secondary: [] },
  'Mountain Climbers':      { primary: ['core'], secondary: ['shoulders'] },
  'Hanging Knee Raises':    { primary: ['core'], secondary: [] },
  'Pallof Press':           { primary: ['core'], secondary: [] },
  'Cable Woodchoppers':     { primary: ['core'], secondary: ['shoulders'] },
  'Dead Bug':               { primary: ['core'], secondary: [] },
  'Decline Sit-Ups':        { primary: ['core'], secondary: [] },
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
  Cardio: [],
};

/**
 * Get muscle groups for an exercise
 * @param {string} exerciseName - Name of the exercise
 * @param {string} category - Category of the exercise (fallback)
 * @returns {Object} { primary: string[], secondary: string[] }
 */
export function getMuscleGroups(exerciseName, category = null) {
  if (EXERCISE_MUSCLE_MAP[exerciseName]) {
    return EXERCISE_MUSCLE_MAP[exerciseName];
  }

  if (category && CATEGORY_MUSCLE_MAP[category]) {
    return {
      primary: CATEGORY_MUSCLE_MAP[category],
      secondary: [],
    };
  }

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

  const recentWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate >= cutoffDate;
  });

  recentWorkouts.forEach(workout => {
    if (!workout.exercises) return;

    workout.exercises.forEach(exercise => {
      const muscles = getMuscleGroups(exercise.name);
      const workoutDate = new Date(workout.date);

      muscles.primary.forEach(muscle => {
        if (muscleData[muscle]) {
          muscleData[muscle].count += 1;
          if (!muscleData[muscle].lastTrainedDate || workoutDate > new Date(muscleData[muscle].lastTrainedDate)) {
            muscleData[muscle].lastTrainedDate = workout.date;
          }
        }
      });

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
  if (daysSince >= 3) return 'recovered';
  if (daysSince >= 1) return 'recent';
  return 'fatigued';
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
