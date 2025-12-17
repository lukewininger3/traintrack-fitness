import { saveWorkouts } from './storage';

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
    // Strength workouts
    {
      name: 'Upper Body Power',
      type: 'Strength',
      exercises: [
        {
          name: 'Barbell Bench Press',
          sets: (week) => [
            { weight: 135 + (week * 5), reps: 10, distance: 0, time: 0 },
            { weight: 155 + (week * 5), reps: 8, distance: 0, time: 0 },
            { weight: 175 + (week * 5), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Pull-Ups',
          sets: () => [
            { weight: 0, reps: 12, distance: 0, time: 0 },
            { weight: 0, reps: 10, distance: 0, time: 0 },
            { weight: 0, reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Overhead Press',
          sets: (week) => [
            { weight: 95 + (week * 5), reps: 8, distance: 0, time: 0 },
            { weight: 105 + (week * 5), reps: 6, distance: 0, time: 0 }
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
          sets: (week) => [
            { weight: 185 + (week * 5), reps: 10, distance: 0, time: 0 },
            { weight: 205 + (week * 5), reps: 8, distance: 0, time: 0 },
            { weight: 225 + (week * 5), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Leg Press',
          sets: (week) => [
            { weight: 225 + (week * 10), reps: 12, distance: 0, time: 0 },
            { weight: 275 + (week * 10), reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Walking Lunges',
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
          sets: (week) => [
            { weight: 225 + (week * 5), reps: 8, distance: 0, time: 0 },
            { weight: 245 + (week * 5), reps: 6, distance: 0, time: 0 },
            { weight: 265 + (week * 5), reps: 5, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Barbell Row',
          sets: (week) => [
            { weight: 135 + (week * 5), reps: 10, distance: 0, time: 0 },
            { weight: 155 + (week * 5), reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Barbell Curl',
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
          sets: (week) => [
            { weight: 50 + (week * 2), reps: 10, distance: 0, time: 0 },
            { weight: 60 + (week * 2), reps: 8, distance: 0, time: 0 },
            { weight: 70 + (week * 2), reps: 6, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Cable Flyes',
          sets: () => [
            { weight: 40, reps: 12, distance: 0, time: 0 },
            { weight: 45, reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Tricep Pushdown',
          sets: () => [
            { weight: 50, reps: 12, distance: 0, time: 0 },
            { weight: 55, reps: 10, distance: 0, time: 0 },
            { weight: 60, reps: 8, distance: 0, time: 0 }
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
          sets: (week) => [
            { weight: 35 + (week * 2), reps: 10, distance: 0, time: 0 },
            { weight: 40 + (week * 2), reps: 8, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Lateral Raises',
          sets: () => [
            { weight: 15, reps: 15, distance: 0, time: 0 },
            { weight: 15, reps: 12, distance: 0, time: 0 },
            { weight: 15, reps: 10, distance: 0, time: 0 }
          ]
        },
        {
          name: 'Plank',
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
  // Each week: 3-5 workouts, mix of strength and cardio
  const weeklyPatterns = [
    [0, 1, 4], // Week 1: Upper Body, Leg Day, Shoulders
    [2, 5, 6], // Week 2: Back & Biceps, Morning Run, Bike
    [0, 3, 7], // Week 3: Upper Body, Chest & Triceps, Swim
    [1, 4, 5], // Week 4: Leg Day, Shoulders, Morning Run
    [2, 3, 6], // Week 5: Back & Biceps, Chest & Triceps, Bike
    [0, 1, 5, 7], // Week 6: Upper Body, Leg Day, Morning Run, Swim
    [2, 4, 6, 7] // Week 7: Back & Biceps, Shoulders, Bike, Swim
  ];

  weeklyPatterns.forEach((weekWorkouts, weekIndex) => {
    weekWorkouts.forEach((templateIndex, dayOffset) => {
      const daysAgo = (weekIndex * 7) + dayOffset;
      const date = getDateDaysAgo(daysAgo);
      const template = workoutTemplates[templateIndex];
      
      workouts.push({
        id: workoutId++,
        date: formatDate(date),
        name: template.name,
        type: template.type,
        exercises: template.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets(weekIndex)
        }))
      });
    });
  });

  // Add a few more random workouts to fill gaps
  const additionalWorkouts = [
    { daysAgo: 2, templateIndex: 5 }, // Running
    { daysAgo: 4, templateIndex: 0 }, // Upper Body
    { daysAgo: 9, templateIndex: 6 }, // Bike
    { daysAgo: 12, templateIndex: 1 }, // Leg Day
    { daysAgo: 16, templateIndex: 5 }, // Running
    { daysAgo: 20, templateIndex: 2 }, // Back & Biceps
    { daysAgo: 25, templateIndex: 7 }, // Swim
    { daysAgo: 30, templateIndex: 3 }, // Chest & Triceps
    { daysAgo: 35, templateIndex: 4 }, // Shoulders
    { daysAgo: 40, templateIndex: 6 }, // Bike
    { daysAgo: 45, templateIndex: 0 }, // Upper Body
  ];

  additionalWorkouts.forEach(({ daysAgo, templateIndex }) => {
    // Check if workout already exists for this day
    const date = formatDate(getDateDaysAgo(daysAgo));
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

  // Sort by date (newest first)
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  await saveWorkouts(workouts);
  console.log(`Sample data initialized with ${workouts.length} workouts over the past 7 weeks!`);
};
