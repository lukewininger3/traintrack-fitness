import { getTodayString } from './storage';

export const calculateWeekStreak = (workouts) => {
  if (workouts.length === 0) return 0;
  
  const getWeekKey = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - day);
    sunday.setHours(0, 0, 0, 0);
    return sunday.toISOString().split('T')[0];
  };
  
  const workoutWeeks = [...new Set(workouts.map(w => getWeekKey(w.date)))].sort().reverse();
  const currentWeek = getWeekKey(getTodayString());
  
  if (workoutWeeks.length === 0 || workoutWeeks[0] !== currentWeek) {
    return 0;
  }
  
  let weekStreak = 1;
  for (let i = 1; i < workoutWeeks.length; i++) {
    const prevSunday = new Date(workoutWeeks[i - 1]);
    const currSunday = new Date(workoutWeeks[i]);
    const daysDiff = Math.round((prevSunday - currSunday) / 86400000);
    
    if (daysDiff === 7) {
      weekStreak++;
    } else {
      break;
    }
  }
  
  return weekStreak;
};

export const getWorkoutsByMonth = (workouts) => {
  const grouped = {};
  
  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        label: monthLabel,
        workouts: []
      };
    }
    grouped[monthKey].workouts.push(workout);
  });
  
  return Object.values(grouped);
};
