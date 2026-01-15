import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_SETTINGS_KEY = '@traintrack_timer_settings';

/**
 * Timer modes
 */
export const TIMER_MODES = {
  MANUAL: 'manual',  // User manually starts timer
  AUTO: 'auto',      // Timer auto-starts after logging a set
};

/**
 * Default timer settings
 */
export const DEFAULT_TIMER_SETTINGS = {
  defaultDuration: 90,
  hapticEnabled: true,
  autoStart: true,
  lastUsedDuration: 90,
  timerMode: TIMER_MODES.MANUAL, // Default to manual mode
};

/**
 * Preset duration options in seconds
 */
export const DURATION_PRESETS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
];

/**
 * Load timer settings from AsyncStorage
 * @returns {Promise<Object>} Timer settings
 */
export async function loadTimerSettings() {
  try {
    const json = await AsyncStorage.getItem(TIMER_SETTINGS_KEY);
    if (json) {
      const settings = JSON.parse(json);
      // Merge with defaults to handle missing fields
      return { ...DEFAULT_TIMER_SETTINGS, ...settings };
    }
    return DEFAULT_TIMER_SETTINGS;
  } catch (error) {
    console.error('Error loading timer settings:', error);
    return DEFAULT_TIMER_SETTINGS;
  }
}

/**
 * Save timer settings to AsyncStorage
 * @param {Object} settings - Timer settings to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveTimerSettings(settings) {
  try {
    const currentSettings = await loadTimerSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error saving timer settings:', error);
    return false;
  }
}

/**
 * Update the last used duration
 * @param {number} duration - Duration in seconds
 */
export async function updateLastUsedDuration(duration) {
  await saveTimerSettings({ lastUsedDuration: duration });
}

/**
 * Toggle auto-start setting
 * @returns {Promise<boolean>} New auto-start value
 */
export async function toggleAutoStart() {
  const settings = await loadTimerSettings();
  const newValue = !settings.autoStart;
  await saveTimerSettings({ autoStart: newValue });
  return newValue;
}

/**
 * Toggle haptic feedback setting
 * @returns {Promise<boolean>} New haptic enabled value
 */
export async function toggleHaptic() {
  const settings = await loadTimerSettings();
  const newValue = !settings.hapticEnabled;
  await saveTimerSettings({ hapticEnabled: newValue });
  return newValue;
}
