export const WORKOUT_TYPES = ['Strength', 'Running', 'Cycling', 'Swimming'];

export const EXERCISE_DATABASE = {
  Chest: [
    'Bench Press',
    'Incline Bench Press',
    'Decline Bench Press',
    'Dumbbell Bench Press',
    'Incline Dumbbell Press',
    'Dumbbell Flyes',
    'Cable Flyes',
    'Chest Press Machine',
    'Push-Ups',
    'Dips',
    'Pec Deck'
  ],
  Back: [
    'Deadlift',
    'Barbell Row',
    'Dumbbell Row',
    'T-Bar Row',
    'Seated Cable Row',
    'Lat Pulldown',
    'Pull-Ups',
    'Chin-Ups',
    'Face Pulls',
    'Shrugs',
    'Hyperextensions'
  ],
  Shoulders: [
    'Overhead Press',
    'Dumbbell Shoulder Press',
    'Arnold Press',
    'Lateral Raises',
    'Front Raises',
    'Rear Delt Flyes',
    'Upright Rows',
    'Cable Lateral Raises'
  ],
  Biceps: [
    'Barbell Curl',
    'Dumbbell Curl',
    'Hammer Curl',
    'Preacher Curl',
    'Concentration Curl',
    'Cable Curl',
    'Incline Dumbbell Curl',
    'Spider Curl',
    '21s'
  ],
  Triceps: [
    'Tricep Pushdown',
    'Overhead Tricep Extension',
    'Skull Crushers',
    'Close-Grip Bench Press',
    'Tricep Dips',
    'Cable Overhead Extension',
    'Diamond Push-Ups',
    'Kickbacks'
  ],
  Legs: [
    'Squat',
    'Front Squat',
    'Leg Press',
    'Romanian Deadlift',
    'Leg Curl',
    'Leg Extension',
    'Walking Lunges',
    'Bulgarian Split Squat',
    'Calf Raises',
    'Goblet Squat',
    'Hack Squat',
    'Step-Ups'
  ],
  Core: [
    'Plank',
    'Side Plank',
    'Crunches',
    'Bicycle Crunches',
    'Russian Twists',
    'Leg Raises',
    'Ab Wheel',
    'Cable Crunches',
    'Mountain Climbers',
    'Hanging Knee Raises'
  ],
  Cardio: [
    'Running',
    'Cycling',
    'Rowing',
    'Treadmill',
    'Elliptical',
    'Stair Climber',
    'Jump Rope',
    'Swimming',
    'Walking',
    'Sprints'
  ]
};

// Helper to get all exercise names from built-in database
export const getAllBuiltInExercises = () => {
  const allExercises = [];
  Object.values(EXERCISE_DATABASE).forEach(categoryExercises => {
    allExercises.push(...categoryExercises);
  });
  return allExercises;
};

// Helper to get all categories
export const getAllCategories = () => {
  return Object.keys(EXERCISE_DATABASE);
};

// Helper to search built-in exercises by name
export const searchBuiltInExercises = (query) => {
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  Object.entries(EXERCISE_DATABASE).forEach(([category, exercises]) => {
    exercises.forEach(exercise => {
      if (exercise.toLowerCase().includes(lowerQuery)) {
        results.push({ name: exercise, category });
      }
    });
  });
  
  return results;
};
