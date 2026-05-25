import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  parseTimeString,
  NOTIFICATION_IDS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../utils/notificationStorage';
import { loadWeeklyGoals, getWeekStart, getDateFromDayOfWeek, DAY_NAMES_FULL } from '../utils/goalsStorage';
import { loadWorkouts } from '../utils/storage';
import { getStreakInfo } from '../utils/calculations';
import { loadWeightData } from '../utils/weightStorage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [loadedSettings, permissionResult] = await Promise.all([
          loadNotificationSettings(),
          Notifications.getPermissionsAsync(),
        ]);
        setSettings(loadedSettings);
        setPermissionStatus(permissionResult.status);
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        setPermissionStatus('granted');
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        // Re-schedule all notifications after permission granted
        await scheduleAllNotifications();
      }

      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  // Update a setting and reschedule notifications
  const updateSetting = useCallback(async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);

    // Reschedule notifications based on changed setting
    if (permissionStatus === 'granted') {
      await scheduleAllNotifications(newSettings);
    }

    return newSettings;
  }, [settings, permissionStatus]);

  // Cancel all scheduled notifications
  const cancelAllNotifications = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }, []);

  // Schedule workout reminder notification
  const scheduleWorkoutReminder = useCallback(async (currentSettings = settings) => {
    if (!currentSettings.workoutReminders) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WORKOUT_REMINDER).catch(() => {});
      return;
    }

    try {
      // Get today's planned workouts
      const weekStart = getWeekStart();
      const goals = await loadWeeklyGoals(weekStart);
      const today = new Date();
      const todayDayOfWeek = today.getDay();

      const todaysWorkouts = goals?.plannedWorkouts?.filter(
        (w) => w.dayOfWeek === todayDayOfWeek && !w.completed
      ) || [];

      if (todaysWorkouts.length === 0) {
        // No workout planned for today, skip
        return;
      }

      const workoutNames = todaysWorkouts.map((w) => w.name).join(', ');
      const { hours, minutes } = parseTimeString(currentSettings.workoutReminderTime);

      // Schedule for the reminder time
      const trigger = new Date();
      trigger.setHours(hours, minutes, 0, 0);

      // If the time has passed today, skip (will schedule tomorrow's check)
      if (trigger <= new Date()) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.WORKOUT_REMINDER,
        content: {
          title: 'Workout Reminder',
          body: todaysWorkouts.length === 1
            ? `You have "${workoutNames}" planned for today!`
            : `You have ${todaysWorkouts.length} workouts planned: ${workoutNames}`,
          sound: true,
          data: { type: 'workout-reminder' },
        },
        trigger: {
          type: 'date',
          date: trigger,
        },
      });
    } catch (error) {
      console.error('Error scheduling workout reminder:', error);
    }
  }, [settings]);

  // Schedule streak reminder notification
  const scheduleStreakReminder = useCallback(async (currentSettings = settings) => {
    if (!currentSettings.streakReminders) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_REMINDER).catch(() => {});
      return;
    }

    try {
      const workouts = await loadWorkouts();
      const { streak, currentWeekHasWorkout } = getStreakInfo(workouts);

      // Only remind if there's a streak to protect and no workout today
      if (streak === 0) return;

      // Check if already worked out today
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const hasWorkoutToday = workouts.some((w) => w.date === todayStr);

      if (hasWorkoutToday) return;

      const { hours, minutes } = parseTimeString(currentSettings.streakReminderTime);

      const trigger = new Date();
      trigger.setHours(hours, minutes, 0, 0);

      if (trigger <= new Date()) return;

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.STREAK_REMINDER,
        content: {
          title: 'Keep Your Streak Going!',
          body: `Don't break your ${streak} week streak! Log a workout to keep it going.`,
          sound: true,
          data: { type: 'streak-reminder' },
        },
        trigger: {
          type: 'date',
          date: trigger,
        },
      });
    } catch (error) {
      console.error('Error scheduling streak reminder:', error);
    }
  }, [settings]);

  // Schedule weight log reminder
  const scheduleWeightLogReminder = useCallback(async (currentSettings = settings) => {
    if (!currentSettings.weightLogReminders) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WEIGHT_LOG_REMINDER).catch(() => {});
      return;
    }

    try {
      // Check if already logged weight today
      const weightData = await loadWeightData();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const hasLoggedToday = weightData?.entries?.some((e) => e.date === todayStr);
      if (hasLoggedToday) return;

      const { hours, minutes } = parseTimeString(currentSettings.weightLogReminderTime);

      const trigger = new Date();
      trigger.setHours(hours, minutes, 0, 0);

      if (trigger <= new Date()) return;

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.WEIGHT_LOG_REMINDER,
        content: {
          title: 'Daily Weigh-In',
          body: 'Time for your daily weigh-in! Track your progress.',
          sound: true,
          data: { type: 'weight-log-reminder' },
        },
        trigger: {
          type: 'date',
          date: trigger,
        },
      });
    } catch (error) {
      console.error('Error scheduling weight log reminder:', error);
    }
  }, [settings]);

  // Schedule weekly recap notification
  const scheduleWeeklyRecap = useCallback(async (currentSettings = settings) => {
    if (!currentSettings.weeklyRecap) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WEEKLY_RECAP).catch(() => {});
      return;
    }

    try {
      const { hours, minutes } = parseTimeString(currentSettings.weeklyRecapTime);

      // Calculate next occurrence of the recap day
      const now = new Date();
      const targetDay = currentSettings.weeklyRecapDay;
      const currentDay = now.getDay();

      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;
      if (daysUntilTarget === 0) {
        // Same day - check if time has passed
        const targetTime = new Date(now);
        targetTime.setHours(hours, minutes, 0, 0);
        if (targetTime <= now) {
          daysUntilTarget = 7; // Schedule for next week
        }
      }

      const trigger = new Date(now);
      trigger.setDate(trigger.getDate() + daysUntilTarget);
      trigger.setHours(hours, minutes, 0, 0);

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.WEEKLY_RECAP,
        content: {
          title: 'Your Weekly Recap',
          body: 'Check out how you did this week!',
          sound: true,
          data: { type: 'weekly-recap' },
        },
        trigger: {
          type: 'date',
          date: trigger,
        },
      });
    } catch (error) {
      console.error('Error scheduling weekly recap:', error);
    }
  }, [settings]);

  // Schedule all notifications
  const scheduleAllNotifications = useCallback(async (currentSettings = settings) => {
    if (permissionStatus !== 'granted') return;

    try {
      // Cancel existing scheduled notifications first
      await cancelAllNotifications();

      // Schedule each type (use allSettled to prevent one failure from blocking others)
      const results = await Promise.allSettled([
        scheduleWorkoutReminder(currentSettings),
        scheduleStreakReminder(currentSettings),
        scheduleWeightLogReminder(currentSettings),
        scheduleWeeklyRecap(currentSettings),
      ]);

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const types = ['workout', 'streak', 'weight', 'recap'];
          console.warn(`Failed to schedule ${types[index]} notification:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }, [
    permissionStatus,
    cancelAllNotifications,
    scheduleWorkoutReminder,
    scheduleStreakReminder,
    scheduleWeightLogReminder,
    scheduleWeeklyRecap,
  ]);

  // Send instant PR celebration notification
  const sendPRCelebration = useCallback(async (exerciseName, weight, reps) => {
    if (!settings.prCelebrations || permissionStatus !== 'granted') return;

    try {
      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_IDS.PR_CELEBRATION}-${Date.now()}`,
        content: {
          title: 'New Personal Record!',
          body: `You just hit a PR on ${exerciseName}: ${weight}lbs x ${reps} reps!`,
          sound: true,
          data: { type: 'pr-celebration', exerciseName, weight, reps },
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Error sending PR celebration:', error);
    }
  }, [settings.prCelebrations, permissionStatus]);

  // Refresh notifications (call when app comes to foreground or data changes)
  const refreshNotifications = useCallback(async () => {
    if (permissionStatus === 'granted') {
      await scheduleAllNotifications();
    }
  }, [permissionStatus, scheduleAllNotifications]);

  const value = {
    // State
    settings,
    permissionStatus,
    isLoading,
    isPermissionGranted: permissionStatus === 'granted',

    // Actions
    requestPermissions,
    updateSetting,
    cancelAllNotifications,
    scheduleAllNotifications,
    refreshNotifications,
    sendPRCelebration,

    // Individual schedulers (for manual refresh)
    scheduleWorkoutReminder,
    scheduleStreakReminder,
    scheduleWeightLogReminder,
    scheduleWeeklyRecap,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
