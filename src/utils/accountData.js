import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshFromCloud } from './storage';
import { refreshWeightDataFromCloud } from './weightStorage';

// Records which account the locally cached data belongs to
const OWNER_KEY = '@traintrack_data_owner';

// Device-level preferences that stay when a different account signs in
const DEVICE_KEYS = new Set([
  OWNER_KEY,
  '@traintrack_theme',
  '@traintrack_notification_settings',
  '@traintrack_timer_settings',
  '@traintrack_onboarding',
]);

let pending = null;

/**
 * Make sure the local cache belongs to `userId`. If it belongs to another
 * account (or its owner is unknown), wipe it and pull this account's data
 * from the cloud before the app shows anything.
 *
 * The pull must finish first: the workout and weight syncs delete cloud rows
 * that are missing locally, so saving into an empty cache would erase them.
 */
export const ensureLocalDataBelongsTo = (userId) => {
  if (!userId) return Promise.resolve();
  if (pending?.userId === userId) return pending.promise;

  const promise = (async () => {
    try {
      const owner = await AsyncStorage.getItem(OWNER_KEY);
      if (owner === userId) return;

      const keys = await AsyncStorage.getAllKeys();
      const userDataKeys = keys.filter(key => key.startsWith('@traintrack') && !DEVICE_KEYS.has(key));
      await AsyncStorage.multiRemove(userDataKeys);
      await AsyncStorage.setItem(OWNER_KEY, userId);

      // Templates, goals, PRs and custom exercises already load from the cloud
      await Promise.allSettled([refreshFromCloud(), refreshWeightDataFromCloud()]);
    } catch (error) {
      console.error('Failed to switch local data to the signed-in account:', error);
    }
  })();

  pending = { userId, promise };
  promise.finally(() => {
    if (pending?.promise === promise) pending = null;
  });
  return promise;
};
