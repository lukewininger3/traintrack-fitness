import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const GOALS_STORAGE_KEY = '@traintrack_weekly_goals';
const GOALS_HISTORY_KEY = '@traintrack_goals_history';

/**
 * Format date to YYYY-MM-DD in local timezone
 */
const formatLocalDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current user
 */
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Get the start of the current week (Monday)
 */
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return formatLocalDate(d);
};

/**
 * Get the end of the current week (Sunday)
 * @param {Date|string} date - Date object or date string (YYYY-MM-DD)
 */
export const getWeekEnd = (date = new Date()) => {
  // If date is a string (YYYY-MM-DD), parse it as local time
  const weekStartStr = typeof date === 'string' ? date : getWeekStart(date);
  const weekStart = new Date(weekStartStr + 'T12:00:00'); // Use noon to avoid timezone issues
  weekStart.setDate(weekStart.getDate() + 6);
  return formatLocalDate(weekStart);
};

/**
 * Format week range for display (e.g., "Jan 13 - 19")
 */
export const formatWeekRange = (weekStart) => {
  const start = new Date(weekStart + 'T12:00:00'); // Use noon to avoid timezone issues
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
};

/**
 * Get day of week (0-6, where 0 = Sunday)
 */
export const getDayOfWeek = (dateString) => {
  return new Date(dateString + 'T12:00:00').getDay(); // Use noon to avoid timezone issues
};

/**
 * Day names for display
 */
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Default weekly goals template
 */
export const createDefaultGoals = (weekStart) => ({
  id: Date.now(),
  weekStart,
  goals: [
    {
      id: Date.now(),
      type: 'count',
      label: 'Total Workouts',
      target: 4,
      current: 0,
      completed: false,
    },
  ],
  plannedWorkouts: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Sync goals to cloud (background, non-blocking)
 */
const syncGoalsToCloud = async (goals) => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('weekly_goals')
      .upsert({
        user_id: user.id,
        week_start: goals.weekStart,
        goals: goals.goals,
        planned_workouts: goals.plannedWorkouts,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,week_start',
      });

    if (error) {
      console.error('Failed to sync goals to cloud:', error);
    }
  } catch (error) {
    console.error('Cloud sync error:', error);
  }
};

/**
 * Refresh goals from cloud (background)
 */
const refreshGoalsFromCloud = async (weekStart) => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch goals from cloud:', error);
      return null;
    }

    if (data) {
      // Update local cache with cloud data
      const cloudGoals = {
        id: data.id,
        weekStart: data.week_start,
        goals: data.goals || [],
        plannedWorkouts: data.planned_workouts || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Save to local
      const localData = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      const allGoals = localData ? JSON.parse(localData) : {};
      allGoals[weekStart] = cloudGoals;
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(allGoals));

      return cloudGoals;
    }

    return null;
  } catch (error) {
    console.error('Cloud refresh error:', error);
    return null;
  }
};

/**
 * Sync all local goals to cloud (for migration)
 */
export const migrateGoalsToCloud = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const localData = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (!localData) return;

    const allGoals = JSON.parse(localData);

    for (const weekStart of Object.keys(allGoals)) {
      const goals = allGoals[weekStart];
      await supabase
        .from('weekly_goals')
        .upsert({
          user_id: user.id,
          week_start: weekStart,
          goals: goals.goals || [],
          planned_workouts: goals.plannedWorkouts || [],
          updated_at: goals.updatedAt || new Date().toISOString(),
        }, {
          onConflict: 'user_id,week_start',
        });
    }

    console.log('Goals migration complete');
  } catch (error) {
    console.error('Goals migration error:', error);
  }
};

/**
 * Load current week's goals
 */
export const loadWeeklyGoals = async (weekStart = getWeekStart()) => {
  try {
    // Load from local first (instant)
    const data = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    const allGoals = data ? JSON.parse(data) : {};
    const localGoals = allGoals[weekStart] || null;

    // Refresh from cloud in background
    refreshGoalsFromCloud(weekStart).catch(err => {
      console.error('Background goals refresh failed:', err);
    });

    return localGoals;
  } catch (error) {
    console.error('Error loading weekly goals:', error);
    return null;
  }
};

/**
 * Load all weekly goals (for achievements tracking)
 */
export const loadAllWeeklyGoals = async () => {
  try {
    const data = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (!data) return [];

    const allGoals = JSON.parse(data);
    // Convert object to array of week data
    return Object.values(allGoals);
  } catch (error) {
    console.error('Error loading all weekly goals:', error);
    return [];
  }
};

/**
 * Save weekly goals
 */
export const saveWeeklyGoals = async (goals) => {
  try {
    // Save locally first (instant)
    const data = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    const allGoals = data ? JSON.parse(data) : {};

    allGoals[goals.weekStart] = {
      ...goals,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(allGoals));

    // Sync to cloud in background (non-blocking)
    syncGoalsToCloud(allGoals[goals.weekStart]).catch(err => {
      console.error('Background goals sync failed:', err);
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving weekly goals:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a new goal to the current week
 */
export const addGoal = async (weekStart, goal) => {
  try {
    let goals = await loadWeeklyGoals(weekStart);

    if (!goals) {
      goals = createDefaultGoals(weekStart);
      goals.goals = [];
    }

    goals.goals.push({
      ...goal,
      id: Date.now(),
      current: 0,
      completed: false,
    });

    return await saveWeeklyGoals(goals);
  } catch (error) {
    console.error('Error adding goal:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a goal
 */
export const removeGoal = async (weekStart, goalId) => {
  try {
    const goals = await loadWeeklyGoals(weekStart);
    if (!goals) return { success: false, error: 'No goals found' };

    goals.goals = goals.goals.filter(g => g.id !== goalId);
    return await saveWeeklyGoals(goals);
  } catch (error) {
    console.error('Error removing goal:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a planned workout to a specific day
 * Allows multiple workouts per day
 * Now supports exercises array with optional distance for cardio
 */
export const addPlannedWorkout = async (weekStart, plannedWorkout) => {
  try {
    let goals = await loadWeeklyGoals(weekStart);

    if (!goals) {
      goals = createDefaultGoals(weekStart);
    }

    // Add new planned workout (allows multiple per day)
    // exercises: [{ name: string, distance?: number (miles for cardio) }]
    goals.plannedWorkouts.push({
      ...plannedWorkout,
      id: Date.now(),
      completed: false,
      workoutId: null,
      exercises: plannedWorkout.exercises || [],
    });

    // Sort by day of week, then by id (creation order)
    goals.plannedWorkouts.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.id - b.id;
    });

    return await saveWeeklyGoals(goals);
  } catch (error) {
    console.error('Error adding planned workout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a planned workout (for editing exercises)
 */
export const updatePlannedWorkout = async (weekStart, plannedWorkoutId, updates) => {
  try {
    const goals = await loadWeeklyGoals(weekStart);
    if (!goals) return { success: false, error: 'No goals found' };

    goals.plannedWorkouts = goals.plannedWorkouts.map(p => {
      if (p.id === plannedWorkoutId) {
        return { ...p, ...updates };
      }
      return p;
    });

    return await saveWeeklyGoals(goals);
  } catch (error) {
    console.error('Error updating planned workout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a planned workout by ID
 */
export const removePlannedWorkout = async (weekStart, plannedWorkoutId) => {
  try {
    const goals = await loadWeeklyGoals(weekStart);
    if (!goals) return { success: false, error: 'No goals found' };

    goals.plannedWorkouts = goals.plannedWorkouts.filter(
      p => p.id !== plannedWorkoutId
    );

    return await saveWeeklyGoals(goals);
  } catch (error) {
    console.error('Error removing planned workout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update goal progress based on workouts
 * Called when a workout is saved
 */
export const updateGoalProgress = async (workouts, weekStart = getWeekStart()) => {
  try {
    let goals = await loadWeeklyGoals(weekStart);
    if (!goals) return { success: true, updated: false };

    // Pass weekStart string directly to avoid timezone issues
    const weekEnd = getWeekEnd(weekStart);

    // Filter workouts for this week
    const weekWorkouts = workouts.filter(w => {
      const workoutDate = w.date;
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    // Update each goal
    goals.goals = goals.goals.map(goal => {
      let current = 0;

      switch (goal.type) {
        case 'count':
          // Total workout count
          current = weekWorkouts.length;
          break;

        case 'type_count':
          // Count specific workout type
          current = weekWorkouts.filter(w => w.type === goal.workoutType).length;
          break;

        case 'days':
          // Count unique days with workouts
          const uniqueDays = new Set(weekWorkouts.map(w => w.date));
          current = uniqueDays.size;
          break;

        case 'duration':
          // Sum of workout durations (if tracked)
          current = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
          break;

        default:
          current = goal.current;
      }

      const completed = current >= goal.target;

      return {
        ...goal,
        current,
        completed,
      };
    });

    // Update planned workouts completion status
    // Group planned workouts by day to properly match with actual workouts
    const usedWorkoutIds = new Set();

    goals.plannedWorkouts = goals.plannedWorkouts.map(planned => {
      // Check if there's a workout on this day that hasn't been matched yet
      const plannedDate = getDateFromDayOfWeek(weekStart, planned.dayOfWeek);
      const dayWorkouts = weekWorkouts.filter(w => w.date === plannedDate);

      // Find a matching workout that hasn't been used yet
      let matchingWorkout = null;

      if (planned.workoutType) {
        // If a specific type is planned, ONLY match that type
        matchingWorkout = dayWorkouts.find(w =>
          !usedWorkoutIds.has(w.id) && w.type === planned.workoutType
        );
      } else {
        // If no specific type, match any unused workout on that day
        matchingWorkout = dayWorkouts.find(w => !usedWorkoutIds.has(w.id));
      }

      // Mark this workout as used so it won't match another planned workout
      if (matchingWorkout) {
        usedWorkoutIds.add(matchingWorkout.id);
      }

      return {
        ...planned,
        completed: !!matchingWorkout,
        workoutId: matchingWorkout?.id || null,
      };
    });

    await saveWeeklyGoals(goals);

    return {
      success: true,
      updated: true,
      goals: goals.goals,
      allGoalsCompleted: goals.goals.every(g => g.completed),
    };
  } catch (error) {
    console.error('Error updating goal progress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get date string from day of week within a specific week
 */
export const getDateFromDayOfWeek = (weekStart, dayOfWeek) => {
  const start = new Date(weekStart + 'T00:00:00');
  // weekStart is Monday (1), adjust for dayOfWeek (0 = Sunday)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() + daysFromMonday);
  return formatLocalDate(start);
};

/**
 * Calculate overall progress percentage
 */
export const calculateOverallProgress = (goals) => {
  if (!goals || !goals.goals || goals.goals.length === 0) return 0;

  const totalProgress = goals.goals.reduce((sum, goal) => {
    const progress = Math.min(goal.current / goal.target, 1);
    return sum + progress;
  }, 0);

  return Math.round((totalProgress / goals.goals.length) * 100);
};

/**
 * Save completed week to history (for achievements)
 */
export const saveWeekToHistory = async (weekStart, allGoalsCompleted) => {
  try {
    const data = await AsyncStorage.getItem(GOALS_HISTORY_KEY);
    const history = data ? JSON.parse(data) : [];

    // Check if already saved
    const existing = history.find(h => h.weekStart === weekStart);
    if (existing) {
      existing.allGoalsCompleted = allGoalsCompleted;
      existing.updatedAt = new Date().toISOString();
    } else {
      history.push({
        weekStart,
        allGoalsCompleted,
        createdAt: new Date().toISOString(),
      });
    }

    await AsyncStorage.setItem(GOALS_HISTORY_KEY, JSON.stringify(history));
    return { success: true };
  } catch (error) {
    console.error('Error saving week to history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get goals history for achievements
 */
export const loadGoalsHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(GOALS_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading goals history:', error);
    return [];
  }
};

/**
 * Count consecutive weeks with all goals completed
 */
export const getConsecutiveCompletedWeeks = async () => {
  try {
    const history = await loadGoalsHistory();

    // Sort by week start descending
    const sorted = history
      .filter(h => h.allGoalsCompleted)
      .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));

    if (sorted.length === 0) return 0;

    let consecutive = 0;
    let currentWeek = new Date(getWeekStart());

    for (const week of sorted) {
      const weekDate = new Date(week.weekStart);
      const diffDays = Math.round((currentWeek - weekDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 7) {
        consecutive++;
        currentWeek = weekDate;
      } else {
        break;
      }
    }

    return consecutive;
  } catch (error) {
    console.error('Error getting consecutive weeks:', error);
    return 0;
  }
};

/**
 * Goal type options for UI
 */
export const GOAL_TYPE_OPTIONS = [
  { value: 'count', label: 'Total Workouts', icon: 'dumbbell' },
  { value: 'type_count', label: 'Specific Type', icon: 'target' },
  { value: 'days', label: 'Active Days', icon: 'calendar' },
];

/**
 * Preset goal templates
 */
export const GOAL_PRESETS = [
  { type: 'count', label: '3 workouts/week', target: 3 },
  { type: 'count', label: '4 workouts/week', target: 4 },
  { type: 'count', label: '5 workouts/week', target: 5 },
  { type: 'type_count', label: '2 strength sessions', target: 2, workoutType: 'Strength' },
  { type: 'type_count', label: '1 cardio session', target: 1, workoutType: 'Running' },
  { type: 'days', label: 'Active 4 days', target: 4 },
];
