import { getTodayString } from './storage';

// Parse date string as local time (not UTC)
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date as YYYY-MM-DD in local time
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get Monday-based week key for a date
const getWeekKey = (dateStr) => {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  // Convert to Monday-based: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysSinceMonday);
  return formatLocalDate(monday);
};

export const calculateWeekStreak = (workouts) => {
  if (workouts.length === 0) return 0;

  const workoutWeeks = [...new Set(workouts.map(w => getWeekKey(w.date)))].sort().reverse();
  const currentWeek = getWeekKey(getTodayString());

  // Calculate previous week key
  const currentWeekDate = parseLocalDate(currentWeek);
  const prevWeekDate = new Date(currentWeekDate);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeek = formatLocalDate(prevWeekDate);

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
    const prevMonday = parseLocalDate(workoutWeeks[i - 1]);
    const currMonday = parseLocalDate(workoutWeeks[i]);
    const daysDiff = Math.round((prevMonday - currMonday) / 86400000);

    if (daysDiff === 7) {
      weekStreak++;
    } else {
      break;
    }
  }

  return weekStreak;
};

// Get detailed streak info including whether current week has a workout
export const getStreakInfo = (workouts) => {
  if (workouts.length === 0) {
    return { streak: 0, currentWeekHasWorkout: false, streakWeekKey: null };
  }

  const workoutWeeks = [...new Set(workouts.map(w => getWeekKey(w.date)))].sort().reverse();
  const currentWeek = getWeekKey(getTodayString());
  const currentWeekHasWorkout = workoutWeeks.includes(currentWeek);

  // Calculate previous week key
  const currentWeekDate = parseLocalDate(currentWeek);
  const prevWeekDate = new Date(currentWeekDate);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeek = formatLocalDate(prevWeekDate);

  const mostRecentWorkoutWeek = workoutWeeks[0];
  const isCurrentOrPreviousWeek = mostRecentWorkoutWeek === currentWeek || mostRecentWorkoutWeek === prevWeek;

  if (!isCurrentOrPreviousWeek) {
    return { streak: 0, currentWeekHasWorkout, streakWeekKey: null };
  }

  // Count streak
  let streak = 1;
  for (let i = 1; i < workoutWeeks.length; i++) {
    const prevMonday = parseLocalDate(workoutWeeks[i - 1]);
    const currMonday = parseLocalDate(workoutWeeks[i]);
    const daysDiff = Math.round((prevMonday - currMonday) / 86400000);

    if (daysDiff === 7) {
      streak++;
    } else {
      break;
    }
  }

  // The streak badge should show on the most recent workout week
  const streakWeekKey = mostRecentWorkoutWeek;

  return { streak, currentWeekHasWorkout, streakWeekKey };
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
