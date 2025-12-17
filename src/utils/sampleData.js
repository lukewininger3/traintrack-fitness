export const SAMPLE_WORKOUTS = [
  {
    id: 1,
    date: '2024-12-10',
    name: 'Upper Body Power',
    type: 'Strength',
    exercises: [
      { 
        name: 'Barbell Bench Press', 
        sets: [
          { weight: 135, reps: 10 },
          { weight: 155, reps: 8 },
          { weight: 175, reps: 6 }
        ]
      },
      { 
        name: 'Pull-Ups', 
        sets: [
          { weight: 0, reps: 12 },
          { weight: 0, reps: 10 },
          { weight: 0, reps: 8 }
        ]
      }
    ]
  },
  {
    id: 2,
    date: '2024-12-08',
    name: 'Leg Day',
    type: 'Strength',
    exercises: [
      { 
        name: 'Barbell Squat', 
        sets: [
          { weight: 185, reps: 10 },
          { weight: 205, reps: 8 },
          { weight: 225, reps: 6 }
        ]
      }
    ]
  },
  {
    id: 3,
    date: '2024-12-06',
    name: 'Morning Run',
    type: 'Running',
    exercises: [
      { 
        name: 'Running', 
        sets: [{ weight: 0, reps: 30, distance: 3.5, time: 30 }]
      }
    ]
  }
];
