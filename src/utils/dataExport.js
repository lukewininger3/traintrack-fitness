import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';

/**
 * Export all user data to a JSON file
 * Includes: workouts, weight data, goals, and settings
 */
export const exportUserData = async () => {
  try {
    // Gather all data from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const traintrackKeys = keys.filter(key => key.startsWith('@traintrack'));

    const allData = {};

    for (const key of traintrackKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Remove the prefix for cleaner export
          const cleanKey = key.replace('@traintrack_', '');
          allData[cleanKey] = JSON.parse(value);
        }
      } catch (parseError) {
        // If JSON parse fails, store as string
        const value = await AsyncStorage.getItem(key);
        const cleanKey = key.replace('@traintrack_', '');
        allData[cleanKey] = value;
      }
    }

    // Get user info (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    const exportData = {
      exportInfo: {
        appName: 'TrainTrack',
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        userId: user?.id || 'local-only',
        email: user?.email || null,
      },
      data: allData,
    };

    // Create filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `traintrack-export-${dateStr}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Write the file
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export TrainTrack Data',
        UTI: 'public.json',
      });
      return { success: true };
    } else {
      Alert.alert(
        'Export Complete',
        `Your data has been saved to:\n${fileUri}`,
        [{ text: 'OK' }]
      );
      return { success: true, fileUri };
    }
  } catch (error) {
    console.error('Export failed:', error);
    Alert.alert(
      'Export Failed',
      'Unable to export your data. Please try again.',
      [{ text: 'OK' }]
    );
    return { success: false, error: error.message };
  }
};

/**
 * Clear all local data (for account deletion)
 * Does NOT delete cloud data - that requires separate API call
 */
export const clearAllLocalData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const traintrackKeys = keys.filter(key => key.startsWith('@traintrack'));

    await AsyncStorage.multiRemove(traintrackKeys);

    return { success: true };
  } catch (error) {
    console.error('Clear local data failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove the user's profile pictures from Supabase Storage.
 * Files are stored as avatars/<userId>-<timestamp>.<ext>.
 */
const deleteProfilePictures = async (userId) => {
  const bucket = supabase.storage.from('profile-pictures');
  const { data: files, error } = await bucket.list('avatars', { search: userId, limit: 100 });
  if (error) throw error;

  const paths = (files || [])
    .filter(f => f.name.startsWith(userId))
    .map(f => `avatars/${f.name}`);
  if (paths.length === 0) return;

  const { error: removeError } = await bucket.remove(paths);
  if (removeError) throw removeError;
};

/**
 * Permanently delete the signed-in user's account: profile pictures, every
 * cloud row they own, and the login itself (via the delete_my_account
 * database function), then local data. Signs out on success.
 */
export const deleteAccount = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Storage cleanup is best-effort; a leftover avatar shouldn't block deletion
    try {
      await deleteProfilePictures(user.id);
    } catch (error) {
      console.warn('Could not remove profile pictures:', error);
    }

    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;

    await clearAllLocalData();
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error('Account deletion failed:', error);
    return { success: false, error: error.message };
  }
};
