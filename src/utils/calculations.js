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

  // Calculate previous week key
  const currentWeekDate = new Date(currentWeek);
  const prevWeekDate = new Date(currentWeekDate);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeek = prevWeekDate.toISOString().split('T')[0];

  if (workoutWeeks.length === 0) return 0;

  // Allow streak to continue if most recent workout is in current week OR previous week
  // This handles the case where we're early in the week and haven't worked out yet
  const mostRecentWorkoutWeek = workoutWeeks[0];
  const isCurrentOrPreviousWeek = mostRecentWorkoutWeek === currentWeek || mostRecentWorkoutWeek === prevWeek;

  if (!isCurrentOrPreviousWeek) {
    return 0;
  }

  // Start counting from the most recent workout week
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
