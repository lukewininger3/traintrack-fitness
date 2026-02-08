/**
 * Pre-built workout program templates.
 *
 * Each program defines a multi-week schedule with exercises,
 * sets, reps, and optional % of 1RM targets.
 */

export const PROGRAM_TEMPLATES = [
  {
    id: 'full_body_3x',
    name: 'Full Body 3×',
    description: 'A balanced 3-day full body program perfect for beginners or those short on time.',
    duration: 4,
    daysPerWeek: 3,
    level: 'beginner',
    schedule: [
      {
        day: 1,
        name: 'Full Body A',
        exercises: [
          { name: 'BB Back Squat', sets: 3, reps: 8, percentOf1RM: 0.70 },
          { name: 'BB Bench Press', sets: 3, reps: 8, percentOf1RM: 0.70 },
          { name: 'BB Bent Over Row', sets: 3, reps: 10 },
          { name: 'BB Overhead Press', sets: 3, reps: 10, percentOf1RM: 0.65 },
          { name: 'Plank', sets: 3, reps: 45 },
        ],
      },
      {
        day: 2,
        name: 'Full Body B',
        exercises: [
          { name: 'BB Deadlift', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'DB Incline Bench Press', sets: 3, reps: 10 },
          { name: 'Lat Pulldown', sets: 3, reps: 10 },
          { name: 'Leg Press', sets: 3, reps: 12 },
          { name: 'DB Curl', sets: 2, reps: 12 },
        ],
      },
      {
        day: 3,
        name: 'Full Body C',
        exercises: [
          { name: 'BB Front Squat', sets: 3, reps: 8 },
          { name: 'DB Bench Press', sets: 3, reps: 10 },
          { name: 'Seated Cable Row', sets: 3, reps: 12 },
          { name: 'DB Lateral Raises', sets: 3, reps: 15 },
          { name: 'Cable Rope Pushdown', sets: 2, reps: 12 },
        ],
      },
    ],
  },

  {
    id: 'upper_lower_4x',
    name: 'Upper/Lower Split',
    description: 'A 4-day upper/lower split for balanced strength and muscle development.',
    duration: 6,
    daysPerWeek: 4,
    level: 'intermediate',
    schedule: [
      {
        day: 1,
        name: 'Upper A (Strength)',
        exercises: [
          { name: 'BB Bench Press', sets: 4, reps: 5, percentOf1RM: 0.80 },
          { name: 'BB Bent Over Row', sets: 4, reps: 6, percentOf1RM: 0.75 },
          { name: 'BB Overhead Press', sets: 3, reps: 8, percentOf1RM: 0.70 },
          { name: 'Pull-Ups', sets: 3, reps: 8 },
          { name: 'DB Curl', sets: 3, reps: 10 },
          { name: 'Tricep Dips', sets: 3, reps: 10 },
        ],
      },
      {
        day: 2,
        name: 'Lower A (Strength)',
        exercises: [
          { name: 'BB Back Squat', sets: 4, reps: 5, percentOf1RM: 0.80 },
          { name: 'BB Romanian Deadlift', sets: 3, reps: 8, percentOf1RM: 0.70 },
          { name: 'Leg Press', sets: 3, reps: 10 },
          { name: 'Leg Curl', sets: 3, reps: 12 },
          { name: 'Standing Calf Raises', sets: 4, reps: 15 },
        ],
      },
      {
        day: 3,
        name: 'Upper B (Volume)',
        exercises: [
          { name: 'DB Incline Bench Press', sets: 4, reps: 10 },
          { name: 'Seated Cable Row', sets: 4, reps: 10 },
          { name: 'DB Lateral Raises', sets: 4, reps: 15 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
          { name: 'DB Hammer Curl', sets: 3, reps: 12 },
          { name: 'Cable Rope Pushdown', sets: 3, reps: 12 },
        ],
      },
      {
        day: 4,
        name: 'Lower B (Volume)',
        exercises: [
          { name: 'BB Front Squat', sets: 3, reps: 8 },
          { name: 'BB Deadlift', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
          { name: 'Leg Extension', sets: 3, reps: 15 },
          { name: 'Leg Curl', sets: 3, reps: 12 },
        ],
      },
    ],
  },

  {
    id: 'ppl_6x',
    name: 'Push/Pull/Legs',
    description: 'Classic 6-day PPL split for maximum training frequency and volume.',
    duration: 8,
    daysPerWeek: 6,
    level: 'intermediate',
    schedule: [
      {
        day: 1,
        name: 'Push A',
        exercises: [
          { name: 'BB Bench Press', sets: 4, reps: 6, percentOf1RM: 0.78 },
          { name: 'BB Overhead Press', sets: 3, reps: 8, percentOf1RM: 0.70 },
          { name: 'DB Incline Bench Press', sets: 3, reps: 10 },
          { name: 'DB Lateral Raises', sets: 4, reps: 15 },
          { name: 'Cable Rope Pushdown', sets: 3, reps: 12 },
          { name: 'DB Overhead Tricep Extension', sets: 3, reps: 12 },
        ],
      },
      {
        day: 2,
        name: 'Pull A',
        exercises: [
          { name: 'BB Deadlift', sets: 3, reps: 5, percentOf1RM: 0.80 },
          { name: 'Pull-Ups', sets: 4, reps: 8 },
          { name: 'BB Bent Over Row', sets: 3, reps: 8 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
          { name: 'BB Curl', sets: 3, reps: 10 },
          { name: 'DB Hammer Curl', sets: 3, reps: 12 },
        ],
      },
      {
        day: 3,
        name: 'Legs A',
        exercises: [
          { name: 'BB Back Squat', sets: 4, reps: 6, percentOf1RM: 0.78 },
          { name: 'BB Romanian Deadlift', sets: 3, reps: 8 },
          { name: 'Leg Press', sets: 3, reps: 12 },
          { name: 'Leg Curl', sets: 3, reps: 12 },
          { name: 'Standing Calf Raises', sets: 4, reps: 15 },
        ],
      },
      {
        day: 4,
        name: 'Push B',
        exercises: [
          { name: 'BB Overhead Press', sets: 4, reps: 6, percentOf1RM: 0.78 },
          { name: 'DB Bench Press', sets: 3, reps: 10 },
          { name: 'Cable Flyes', sets: 3, reps: 12 },
          { name: 'DB Lateral Raises', sets: 4, reps: 15 },
          { name: 'Tricep Dips', sets: 3, reps: 10 },
        ],
      },
      {
        day: 5,
        name: 'Pull B',
        exercises: [
          { name: 'BB Bent Over Row', sets: 4, reps: 6 },
          { name: 'Lat Pulldown', sets: 3, reps: 10 },
          { name: 'Seated Cable Row', sets: 3, reps: 12 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
          { name: 'DB Curl', sets: 3, reps: 12 },
        ],
      },
      {
        day: 6,
        name: 'Legs B',
        exercises: [
          { name: 'BB Front Squat', sets: 3, reps: 8 },
          { name: 'BB Deadlift', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
          { name: 'Leg Extension', sets: 3, reps: 15 },
          { name: 'Leg Curl', sets: 3, reps: 12 },
          { name: 'Standing Calf Raises', sets: 4, reps: 15 },
        ],
      },
    ],
  },

  {
    id: '531_basics',
    name: '5/3/1 Basics',
    description: 'Jim Wendler\'s proven 4-day strength program with progressive overload built in.',
    duration: 12,
    daysPerWeek: 4,
    level: 'advanced',
    schedule: [
      {
        day: 1,
        name: 'Squat Day',
        exercises: [
          { name: 'BB Back Squat', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'Leg Press', sets: 4, reps: 10 },
          { name: 'Leg Curl', sets: 3, reps: 12 },
          { name: 'Plank', sets: 3, reps: 60 },
        ],
      },
      {
        day: 2,
        name: 'Bench Day',
        exercises: [
          { name: 'BB Bench Press', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'DB Bench Press', sets: 4, reps: 10 },
          { name: 'BB Bent Over Row', sets: 4, reps: 10 },
          { name: 'DB Curl', sets: 3, reps: 12 },
        ],
      },
      {
        day: 3,
        name: 'Deadlift Day',
        exercises: [
          { name: 'BB Deadlift', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'BB Romanian Deadlift', sets: 3, reps: 10 },
          { name: 'Pull-Ups', sets: 4, reps: 8 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
        ],
      },
      {
        day: 4,
        name: 'Press Day',
        exercises: [
          { name: 'BB Overhead Press', sets: 3, reps: 5, percentOf1RM: 0.75 },
          { name: 'DB Incline Bench Press', sets: 4, reps: 10 },
          { name: 'DB Lateral Raises', sets: 4, reps: 15 },
          { name: 'Cable Rope Pushdown', sets: 3, reps: 12 },
        ],
      },
    ],
  },
];

/**
 * Get a program template by ID
 */
export function getProgramTemplate(id) {
  return PROGRAM_TEMPLATES.find(p => p.id === id) || null;
}
