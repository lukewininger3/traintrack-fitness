/**
 * Exercise Metadata
 *
 * Equipment requirements, difficulty levels, and movement type (compound vs isolation)
 * for every exercise in the EXERCISE_DATABASE. Keyed by exercise name.
 */

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'smith',
  'bodyweight',
];

export const EQUIPMENT_LABELS = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  cable: 'Cables',
  machine: 'Machines',
  smith: 'Smith Machine',
  bodyweight: 'Bodyweight',
};

// Maps each exercise to its required equipment and difficulty level
export const EXERCISE_EQUIPMENT_MAP = {
  // Chest
  'BB Bench Press':            { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Bench Press':            { equipment: ['dumbbell'], difficulty: 'beginner' },
  'SM Bench Press':            { equipment: ['smith'], difficulty: 'beginner' },
  'BB Incline Bench Press':    { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Incline Bench Press':    { equipment: ['dumbbell'], difficulty: 'beginner' },
  'SM Incline Bench Press':    { equipment: ['smith'], difficulty: 'beginner' },
  'BB Decline Bench Press':    { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Decline Bench Press':    { equipment: ['dumbbell'], difficulty: 'intermediate' },
  'DB Flyes':                  { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Cable Flyes':               { equipment: ['cable'], difficulty: 'beginner' },
  'Chest Press Machine':       { equipment: ['machine'], difficulty: 'beginner' },
  'Pec Deck':                  { equipment: ['machine'], difficulty: 'beginner' },
  'Push-Ups':                  { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Dips':                      { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Landmine Press':            { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Pullover':               { equipment: ['dumbbell'], difficulty: 'intermediate' },

  // Back
  'BB Deadlift':               { equipment: ['barbell'], difficulty: 'advanced' },
  'BB Bent Over Row':          { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Row':                    { equipment: ['dumbbell'], difficulty: 'beginner' },
  'T-Bar Row':                 { equipment: ['barbell'], difficulty: 'intermediate' },
  'Seated Cable Row':          { equipment: ['cable'], difficulty: 'beginner' },
  'Lat Pulldown':              { equipment: ['cable'], difficulty: 'beginner' },
  'Pull-Ups':                  { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Chin-Ups':                  { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Face Pulls':                { equipment: ['cable'], difficulty: 'beginner' },
  'BB Shrugs':                 { equipment: ['barbell'], difficulty: 'beginner' },
  'DB Shrugs':                 { equipment: ['dumbbell'], difficulty: 'beginner' },
  'SM Shrugs':                 { equipment: ['smith'], difficulty: 'beginner' },
  'Hyperextensions':           { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Pendlay Row':               { equipment: ['barbell'], difficulty: 'intermediate' },
  'Chest Supported DB Row':    { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Cable Pullover':            { equipment: ['cable'], difficulty: 'beginner' },
  'Straight Arm Pulldown':     { equipment: ['cable'], difficulty: 'beginner' },

  // Shoulders
  'BB Overhead Press':         { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Overhead Press':         { equipment: ['dumbbell'], difficulty: 'beginner' },
  'SM Overhead Press':         { equipment: ['smith'], difficulty: 'beginner' },
  'Arnold Press':              { equipment: ['dumbbell'], difficulty: 'intermediate' },
  'DB Lateral Raises':         { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Cable Lateral Raises':      { equipment: ['cable'], difficulty: 'beginner' },
  'DB Front Raises':           { equipment: ['dumbbell'], difficulty: 'beginner' },
  'DB Rear Delt Flyes':        { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Cable Rear Delt Flyes':     { equipment: ['cable'], difficulty: 'beginner' },
  'Reverse Pec Deck':          { equipment: ['machine'], difficulty: 'beginner' },
  'BB Upright Row':            { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Upright Row':            { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Machine Shoulder Press':    { equipment: ['machine'], difficulty: 'beginner' },

  // Biceps
  'BB Curl':                   { equipment: ['barbell'], difficulty: 'beginner' },
  'EZ Bar Curl':               { equipment: ['barbell'], difficulty: 'beginner' },
  'DB Curl':                   { equipment: ['dumbbell'], difficulty: 'beginner' },
  'DB Hammer Curl':            { equipment: ['dumbbell'], difficulty: 'beginner' },
  'BB Preacher Curl':          { equipment: ['barbell'], difficulty: 'beginner' },
  'DB Preacher Curl':          { equipment: ['dumbbell'], difficulty: 'beginner' },
  'DB Concentration Curl':     { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Cable Curl':                { equipment: ['cable'], difficulty: 'beginner' },
  'DB Incline Curl':           { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Spider Curl':               { equipment: ['dumbbell'], difficulty: 'intermediate' },
  'Reverse Curl':              { equipment: ['barbell'], difficulty: 'beginner' },
  'Machine Curl':              { equipment: ['machine'], difficulty: 'beginner' },

  // Triceps
  'Cable Rope Pushdown':       { equipment: ['cable'], difficulty: 'beginner' },
  'Cable Straight Bar Pushdown': { equipment: ['cable'], difficulty: 'beginner' },
  'BB Skull Crushers':         { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Skull Crushers':         { equipment: ['dumbbell'], difficulty: 'intermediate' },
  'BB Close-Grip Bench Press': { equipment: ['barbell'], difficulty: 'intermediate' },
  'SM Close-Grip Bench Press': { equipment: ['smith'], difficulty: 'beginner' },
  'Tricep Dips':               { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Cable Overhead Extension':  { equipment: ['cable'], difficulty: 'beginner' },
  'DB Overhead Tricep Extension': { equipment: ['dumbbell'], difficulty: 'beginner' },
  'DB Kickbacks':              { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Diamond Push-Ups':          { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Machine Tricep Extension':  { equipment: ['machine'], difficulty: 'beginner' },

  // Legs
  'BB Back Squat':             { equipment: ['barbell'], difficulty: 'intermediate' },
  'BB Front Squat':            { equipment: ['barbell'], difficulty: 'advanced' },
  'SM Squat':                  { equipment: ['smith'], difficulty: 'beginner' },
  'Goblet Squat':              { equipment: ['dumbbell'], difficulty: 'beginner' },
  'Hack Squat':                { equipment: ['machine'], difficulty: 'intermediate' },
  'Leg Press':                 { equipment: ['machine'], difficulty: 'beginner' },
  'BB Romanian Deadlift':      { equipment: ['barbell'], difficulty: 'intermediate' },
  'DB Romanian Deadlift':      { equipment: ['dumbbell'], difficulty: 'beginner' },
  'BB Sumo Deadlift':          { equipment: ['barbell'], difficulty: 'intermediate' },
  'Leg Curl':                  { equipment: ['machine'], difficulty: 'beginner' },
  'Leg Extension':             { equipment: ['machine'], difficulty: 'beginner' },
  'DB Walking Lunges':         { equipment: ['dumbbell'], difficulty: 'beginner' },
  'BB Walking Lunges':         { equipment: ['barbell'], difficulty: 'intermediate' },
  'SM Lunges':                 { equipment: ['smith'], difficulty: 'beginner' },
  'Bulgarian Split Squat':     { equipment: ['dumbbell', 'bodyweight'], difficulty: 'intermediate' },
  'Standing Calf Raises':      { equipment: ['machine', 'bodyweight'], difficulty: 'beginner' },
  'Seated Calf Raises':        { equipment: ['machine'], difficulty: 'beginner' },
  'SM Calf Raises':            { equipment: ['smith'], difficulty: 'beginner' },
  'DB Step-Ups':               { equipment: ['dumbbell'], difficulty: 'beginner' },
  'BB Hip Thrust':             { equipment: ['barbell'], difficulty: 'intermediate' },
  'SM Hip Thrust':             { equipment: ['smith'], difficulty: 'beginner' },
  'Good Mornings':             { equipment: ['barbell'], difficulty: 'intermediate' },

  // Core
  'Plank':                     { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Side Plank':                { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Crunches':                  { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Bicycle Crunches':          { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Russian Twists':            { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Hanging Leg Raises':        { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Ab Wheel':                  { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Cable Crunches':            { equipment: ['cable'], difficulty: 'beginner' },
  'Mountain Climbers':         { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Hanging Knee Raises':       { equipment: ['bodyweight'], difficulty: 'intermediate' },
  'Pallof Press':              { equipment: ['cable'], difficulty: 'beginner' },
  'Cable Woodchoppers':        { equipment: ['cable'], difficulty: 'beginner' },
  'Dead Bug':                  { equipment: ['bodyweight'], difficulty: 'beginner' },
  'Decline Sit-Ups':           { equipment: ['bodyweight'], difficulty: 'beginner' },
};

// Compound (multi-joint) vs isolation (single-joint) classification
export const EXERCISE_TYPE_MAP = {
  // Chest
  'BB Bench Press': 'compound',
  'DB Bench Press': 'compound',
  'SM Bench Press': 'compound',
  'BB Incline Bench Press': 'compound',
  'DB Incline Bench Press': 'compound',
  'SM Incline Bench Press': 'compound',
  'BB Decline Bench Press': 'compound',
  'DB Decline Bench Press': 'compound',
  'DB Flyes': 'isolation',
  'Cable Flyes': 'isolation',
  'Chest Press Machine': 'compound',
  'Pec Deck': 'isolation',
  'Push-Ups': 'compound',
  'Dips': 'compound',
  'Landmine Press': 'compound',
  'DB Pullover': 'isolation',

  // Back
  'BB Deadlift': 'compound',
  'BB Bent Over Row': 'compound',
  'DB Row': 'compound',
  'T-Bar Row': 'compound',
  'Seated Cable Row': 'compound',
  'Lat Pulldown': 'compound',
  'Pull-Ups': 'compound',
  'Chin-Ups': 'compound',
  'Face Pulls': 'isolation',
  'BB Shrugs': 'isolation',
  'DB Shrugs': 'isolation',
  'SM Shrugs': 'isolation',
  'Hyperextensions': 'compound',
  'Pendlay Row': 'compound',
  'Chest Supported DB Row': 'compound',
  'Cable Pullover': 'isolation',
  'Straight Arm Pulldown': 'isolation',

  // Shoulders
  'BB Overhead Press': 'compound',
  'DB Overhead Press': 'compound',
  'SM Overhead Press': 'compound',
  'Arnold Press': 'compound',
  'DB Lateral Raises': 'isolation',
  'Cable Lateral Raises': 'isolation',
  'DB Front Raises': 'isolation',
  'DB Rear Delt Flyes': 'isolation',
  'Cable Rear Delt Flyes': 'isolation',
  'Reverse Pec Deck': 'isolation',
  'BB Upright Row': 'compound',
  'DB Upright Row': 'compound',
  'Machine Shoulder Press': 'compound',

  // Biceps (all isolation)
  'BB Curl': 'isolation',
  'EZ Bar Curl': 'isolation',
  'DB Curl': 'isolation',
  'DB Hammer Curl': 'isolation',
  'BB Preacher Curl': 'isolation',
  'DB Preacher Curl': 'isolation',
  'DB Concentration Curl': 'isolation',
  'Cable Curl': 'isolation',
  'DB Incline Curl': 'isolation',
  'Spider Curl': 'isolation',
  'Reverse Curl': 'isolation',
  'Machine Curl': 'isolation',

  // Triceps
  'Cable Rope Pushdown': 'isolation',
  'Cable Straight Bar Pushdown': 'isolation',
  'BB Skull Crushers': 'isolation',
  'DB Skull Crushers': 'isolation',
  'BB Close-Grip Bench Press': 'compound',
  'SM Close-Grip Bench Press': 'compound',
  'Tricep Dips': 'compound',
  'Cable Overhead Extension': 'isolation',
  'DB Overhead Tricep Extension': 'isolation',
  'DB Kickbacks': 'isolation',
  'Diamond Push-Ups': 'compound',
  'Machine Tricep Extension': 'isolation',

  // Legs
  'BB Back Squat': 'compound',
  'BB Front Squat': 'compound',
  'SM Squat': 'compound',
  'Goblet Squat': 'compound',
  'Hack Squat': 'compound',
  'Leg Press': 'compound',
  'BB Romanian Deadlift': 'compound',
  'DB Romanian Deadlift': 'compound',
  'BB Sumo Deadlift': 'compound',
  'Leg Curl': 'isolation',
  'Leg Extension': 'isolation',
  'DB Walking Lunges': 'compound',
  'BB Walking Lunges': 'compound',
  'SM Lunges': 'compound',
  'Bulgarian Split Squat': 'compound',
  'Standing Calf Raises': 'isolation',
  'Seated Calf Raises': 'isolation',
  'SM Calf Raises': 'isolation',
  'DB Step-Ups': 'compound',
  'BB Hip Thrust': 'compound',
  'SM Hip Thrust': 'compound',
  'Good Mornings': 'compound',

  // Core
  'Plank': 'isolation',
  'Side Plank': 'isolation',
  'Crunches': 'isolation',
  'Bicycle Crunches': 'isolation',
  'Russian Twists': 'isolation',
  'Hanging Leg Raises': 'isolation',
  'Ab Wheel': 'compound',
  'Cable Crunches': 'isolation',
  'Mountain Climbers': 'compound',
  'Hanging Knee Raises': 'isolation',
  'Pallof Press': 'isolation',
  'Cable Woodchoppers': 'compound',
  'Dead Bug': 'isolation',
  'Decline Sit-Ups': 'isolation',
};

export function getExerciseMetadata(exerciseName) {
  return EXERCISE_EQUIPMENT_MAP[exerciseName] || { equipment: ['bodyweight'], difficulty: 'beginner' };
}

export function getExerciseType(exerciseName) {
  return EXERCISE_TYPE_MAP[exerciseName] || 'isolation';
}

export function isCompound(exerciseName) {
  return getExerciseType(exerciseName) === 'compound';
}
