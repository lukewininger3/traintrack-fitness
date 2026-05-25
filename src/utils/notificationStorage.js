import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@traintrack_notification_settings';

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS = {
  // Workout reminders
  workoutReminders: true,
  workoutReminderTime: '09:00', // HH:mm format

  // Streak reminders (evening reminder if no workout today)
  streakReminders: true,
  streakReminderTime: '20:00',

  // Weight log reminders
  weightLogReminders: false,
  weightLogReminderTime: '08:00',

  // PR celebrations (instant notification when PR is set)
  prCelebrations: true,

  // Weekly recap notification
  weeklyRecap: true,
  weeklyRecapDay: 0, // 0 = Sunday, 1 = Monday, etc.
  weeklyRecapTime: '18:00',
};

/**
 * Load notification settings from storage
 */
export const loadNotificationSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (data) {
      const saved = JSON.parse(data);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...saved };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

/**
 * Save notification settings to storage
 */
export const saveNotificationSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    return { success: true };
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a single notification setting
 */
export const updateNotificationSetting = async (key, value) => {
  try {
    const current = await loadNotificationSettings();
    const updated = { ...current, [key]: value };
    await saveNotificationSettings(updated);
    return { success: true, settings: updated };
  } catch (error) {
    console.error('Error updating notification setting:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Parse time string (HH:mm) to hours and minutes
 */
export const parseTimeString = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

/**
 * Format hours and minutes to time string (HH:mm)
 */
export const formatTimeString = (hours, minutes) => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Format time for display (e.g., "9:00 AM")
 */
export const formatTimeForDisplay = (timeStr) => {
  const { hours, minutes } = parseTimeString(timeStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Day names for weekly recap day selection
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Notification identifiers for scheduling
 */
export const NOTIFICATION_IDS = {
  WORKOUT_REMINDER: 'workout-reminder',
  STREAK_REMINDER: 'streak-reminder',
  WEIGHT_LOG_REMINDER: 'weight-log-reminder',
  WEEKLY_RECAP: 'weekly-recap',
  PR_CELEBRATION: 'pr-celebration',
};
