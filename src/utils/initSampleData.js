import { saveWorkouts } from './storage';
import { formatDateForStorage } from './dateFormatter';

// Helper function to get date N days ago
const getDateDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const initializeSampleData = async () => {
  const workouts = [];
  let workoutId = Date.now();

  // Generate workouts for the past 7 weeks (49 days)
  // Create 3-5 workouts per week with variety
  
  const workoutTemplates = [
    // Strength workouts with MIXED progression
    {
      name: 'Upper Body Power',
      type: 'Strength',
      exercises: [
        {
          name: 'Barbell Bench Press',
          // INCREASING - Good progress
          sets: (week) => [
            { weight: 135 + (week * 5), reps: 10, distance: 0, time: 0 },
            { weight: 155 + (week * 5), reps: 8, distance: 0, time: 0 },
            { weight: 175 + (week * 5), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Pull-Ups',
          // STABLE - No change
          sets: () => [
            { weight: 0, reps: 12, distance: 0, time: 0 },
            { weight: 0, reps: 10, distance: 0, time: 0 },
            { weight: 0, reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Overhead Press',
          // DECREASING - Deload or fatigue
          sets: (week) => [
            { weight: 135 - (week * 3), reps: 8, distance: 0, time: 0 },
            { weight: 145 - (week * 3), reps: 6, distance: 0, time: 0 }
          ]
        }
      ]
    },
    {
      name: 'Leg Day',
      type: 'Strength',
      exercises: [
        {
          name: 'Barbell Squat',
          // INCREASING - Strong gains
          sets: (week) => [
            { weight: 185 + (week * 6), reps: 10, distance: 0, time: 0 },
            { weight: 205 + (week * 6), reps: 8, distance: 0, time: 0 },
            { weight: 225 + (week * 6), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Leg Press',
          // INCREASING - Moderate gains
          sets: (week) => [
            { weight: 225 + (week * 8), reps: 12, distance: 0, time: 0 },
            { weight: 275 + (week * 8), reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Walking Lunges',
          // STABLE
          sets: () => [
            { weight: 0, reps: 20, distance: 0, time: 0 },
            { weight: 0, reps: 20, distance: 0, time: 0 }
          ]
        }
      ]
    },
    {
      name: 'Back & Biceps',
      type: 'Strength',
      exercises: [
        {
          name: 'Barbell Deadlift',
          // INCREASING - Excellent progress
          sets: (week) => [
            { weight: 225 + (week * 7), reps: 8, distance: 0, time: 0 },
            { weight: 245 + (week * 7), reps: 6, distance: 0, time: 0 },
            { weight: 265 + (week * 7), reps: 5, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Barbell Row',
          // DECREASING - Form issues or fatigue
          sets: (week) => [
            { weight: 155 - (week * 4), reps: 10, distance: 0, time: 0 },
            { weight: 175 - (week * 4), reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Barbell Curl',
          // STABLE
          sets: () => [
            { weight: 65, reps: 12, distance: 0, time: 0 },
            { weight: 65, reps: 10, distance: 0, time: 0 },
            { weight: 65, reps: 8, distance: 0, time: 0 }
          ]
        }
      ]
    },
    {
      name: 'Chest & Triceps',
      type: 'Strength',
      exercises: [
        {
          name: 'Dumbbell Bench Press',
          // INCREASING - Good progress
          sets: (week) => [
            { weight: 50 + (week * 3), reps: 10, distance: 0, time: 0 },
            { weight: 60 + (week * 3), reps: 8, distance: 0, time: 0 },
            { weight: 70 + (week * 3), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Cable Flyes',
          // STABLE
          sets: () => [
            { weight: 40, reps: 12, distance: 0, time: 0 },
            { weight: 45, reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Tricep Pushdown',
          // INCREASING - Small gains
          sets: (week) => [
            { weight: 50 + (week * 2), reps: 12, distance: 0, time: 0 },
            { weight: 55 + (week * 2), reps: 10, distance: 0, time: 0 },
            { weight: 60 + (week * 2), reps: 8, distance: 0, time: 0 }
          ]
        }
      ]
    },
    {
      name: 'Shoulders & Core',
      type: 'Strength',
      exercises: [
        {
          name: 'Dumbbell Shoulder Press',
          // DECREASING - Shoulder fatigue
          sets: (week) => [
            { weight: 55 - (week * 2), reps: 10, distance: 0, time: 0 },
            { weight: 60 - (week * 2), reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Lateral Raises',
          // STABLE
          sets: () => [
            { weight: 15, reps: 15, distance: 0, time: 0 },
            { weight: 15, reps: 12, distance: 0, time: 0 },
            { weight: 15, reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Plank',
          // STABLE
          sets: () => [
            { weight: 0, reps: 60, distance: 0, time: 0 },
            { weight: 0, reps: 45, distance: 0, time: 0 }
          ]
        }
      ]
    },
    // Cardio workouts
    {
      name: 'Morning Run',
      type: 'Running',
      exercises: [
        {
          name: 'Running',
          sets: (week) => [
            { weight: 0, reps: 0, distance: 3.0 + (week * 0.2), time: 28 + (week * 1) }
          ]
        }
      ]
    },
    {
      name: 'Long Distance Run',
      type: 'Running',
      exercises: [
        {
          name: 'Running',
          sets: (week) => [
            { weight: 0, reps: 0, distance: 5.0 + (week * 0.3), time: 45 + (week * 2) }
          ]
        }
      ]
    },
    {
      name: 'Bike Ride',
      type: 'Cycling',
      exercises: [
        {
          name: 'Cycling',
          sets: (week) => [
            { weight: 0, reps: 0, distance: 10.0 + (week * 1), time: 40 + (week * 2) }
          ]
        }
      ]
    },
    {
      name: 'Swim Session',
      type: 'Swimming',
      exercises: [
        {
          name: 'Swimming',
          sets: (week) => [
            { weight: 0, reps: 0, distance: 0.5 + (week * 0.1), time: 20 + (week * 1) }
          ]
        }
      ]
    }
  ];

  // Generate workouts for 7 weeks
  const weeklyPatterns = [
    [0, 1, 4], // Week 1
    [2, 5, 6], // Week 2
    [0, 3, 7], // Week 3
    [1, 4, 5], // Week 4
    [2, 3, 6], // Week 5
    [0, 1, 5, 7], // Week 6
    [2, 4, 6, 7] // Week 7
  ];

  weeklyPatterns.forEach((weekWorkouts, weekIndex) => {
    weekWorkouts.forEach((templateIndex, dayOffset) => {
      const daysAgo = (weekIndex * 7) + dayOffset;
      const date = getDateDaysAgo(daysAgo);
      const template = workoutTemplates[templateIndex];

      workouts.push({
        id: workoutId++,
        date: formatDateForStorage(date),
        name: template.name,
        type: template.type,
        exercises: template.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets(weekIndex)
        }))
      });
    });
  });

  // Add additional workouts
  const additionalWorkouts = [
    { daysAgo: 2, templateIndex: 5 },
    { daysAgo: 4, templateIndex: 0 },
    { daysAgo: 9, templateIndex: 6 },
    { daysAgo: 12, templateIndex: 1 },
    { daysAgo: 16, templateIndex: 5 },
    { daysAgo: 20, templateIndex: 2 },
    { daysAgo: 25, templateIndex: 7 },
    { daysAgo: 30, templateIndex: 3 },
    { daysAgo: 35, templateIndex: 4 },
    { daysAgo: 40, templateIndex: 6 },
    { daysAgo: 45, templateIndex: 0 },
  ];

  additionalWorkouts.forEach(({ daysAgo, templateIndex }) => {
    const date = formatDateForStorage(getDateDaysAgo(daysAgo));
    const exists = workouts.some(w => w.date === date);
    
    if (!exists) {
      const template = workoutTemplates[templateIndex];
      const weekIndex = Math.floor(daysAgo / 7);
      
      workouts.push({
        id: workoutId++,
        date: date,
        name: template.name,
        type: template.type,
        exercises: template.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets(weekIndex)
        }))
      });
    }
  });

  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  await saveWorkouts(workouts);
};
