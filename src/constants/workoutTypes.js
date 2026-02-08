export const WORKOUT_TYPES = ['Strength', 'Running', 'Cycling', 'Swimming'];

export const EXERCISE_DATABASE = {
  Chest: [
    'BB Bench Press',
    'DB Bench Press',
    'SM Bench Press',
    'BB Incline Bench Press',
    'DB Incline Bench Press',
    'SM Incline Bench Press',
    'BB Decline Bench Press',
    'DB Decline Bench Press',
    'DB Flyes',
    'Cable Flyes',
    'Chest Press Machine',
    'Pec Deck',
    'Push-Ups',
    'Dips',
    'Landmine Press',
    'DB Pullover',
  ],
  Back: [
    'BB Deadlift',
    'BB Bent Over Row',
    'DB Row',
    'T-Bar Row',
    'Seated Cable Row',
    'Lat Pulldown',
    'Pull-Ups',
    'Chin-Ups',
    'Face Pulls',
    'BB Shrugs',
    'DB Shrugs',
    'SM Shrugs',
    'Hyperextensions',
    'Pendlay Row',
    'Chest Supported DB Row',
    'Cable Pullover',
    'Straight Arm Pulldown',
  ],
  Shoulders: [
    'BB Overhead Press',
    'DB Overhead Press',
    'SM Overhead Press',
    'Arnold Press',
    'DB Lateral Raises',
    'Cable Lateral Raises',
    'DB Front Raises',
    'DB Rear Delt Flyes',
    'Cable Rear Delt Flyes',
    'Reverse Pec Deck',
    'BB Upright Row',
    'DB Upright Row',
    'Machine Shoulder Press',
  ],
  Biceps: [
    'BB Curl',
    'EZ Bar Curl',
    'DB Curl',
    'DB Hammer Curl',
    'BB Preacher Curl',
    'DB Preacher Curl',
    'DB Concentration Curl',
    'Cable Curl',
    'DB Incline Curl',
    'Spider Curl',
    'Reverse Curl',
    'Machine Curl',
  ],
  Triceps: [
    'Cable Rope Pushdown',
    'Cable Straight Bar Pushdown',
    'BB Skull Crushers',
    'DB Skull Crushers',
    'BB Close-Grip Bench Press',
    'SM Close-Grip Bench Press',
    'Tricep Dips',
    'Cable Overhead Extension',
    'DB Overhead Tricep Extension',
    'DB Kickbacks',
    'Diamond Push-Ups',
    'Machine Tricep Extension',
  ],
  Legs: [
    'BB Back Squat',
    'BB Front Squat',
    'SM Squat',
    'Goblet Squat',
    'Hack Squat',
    'Leg Press',
    'BB Romanian Deadlift',
    'DB Romanian Deadlift',
    'BB Sumo Deadlift',
    'Leg Curl',
    'Leg Extension',
    'DB Walking Lunges',
    'BB Walking Lunges',
    'SM Lunges',
    'Bulgarian Split Squat',
    'Standing Calf Raises',
    'Seated Calf Raises',
    'SM Calf Raises',
    'DB Step-Ups',
    'BB Hip Thrust',
    'SM Hip Thrust',
    'Good Mornings',
  ],
  Core: [
    'Plank',
    'Side Plank',
    'Crunches',
    'Bicycle Crunches',
    'Russian Twists',
    'Hanging Leg Raises',
    'Ab Wheel',
    'Cable Crunches',
    'Mountain Climbers',
    'Hanging Knee Raises',
    'Pallof Press',
    'Cable Woodchoppers',
    'Dead Bug',
    'Decline Sit-Ups',
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
    'Sprints',
  ],
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
