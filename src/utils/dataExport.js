import * as FileSystem from 'expo-file-system';
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
 * Delete all user data from cloud (Supabase)
 * This deletes workouts, weight entries, goals, and profile
 */
export const deleteCloudData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, message: 'No user logged in' };
    }

    // Delete in order to respect foreign key constraints
    // 1. Delete weight entries
    await supabase
      .from('weight_entries')
      .delete()
      .eq('user_id', user.id);

    // 2. Delete weight settings
    await supabase
      .from('weight_settings')
      .delete()
      .eq('user_id', user.id);

    // 3. Delete workouts
    await supabase
      .from('workouts')
      .delete()
      .eq('user_id', user.id);

    // 4. Delete weekly goals
    await supabase
      .from('weekly_goals')
      .delete()
      .eq('user_id', user.id);

    // 5. Delete shared workouts
    await supabase
      .from('shared_workouts')
      .delete()
      .eq('user_id', user.id);

    // 6. Delete profile (this should be last)
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    return { success: true };
  } catch (error) {
    console.error('Delete cloud data failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Full account deletion - clears local data, cloud data, and signs out
 */
export const deleteAccount = async () => {
  try {
    // 1. Delete cloud data
    const cloudResult = await deleteCloudData();
    if (!cloudResult.success) {
      console.warn('Cloud deletion partial failure:', cloudResult.error);
    }

    // 2. Clear local data
    const localResult = await clearAllLocalData();
    if (!localResult.success) {
      console.warn('Local deletion partial failure:', localResult.error);
    }

    // 3. Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error('Account deletion failed:', error);
    return { success: false, error: error.message };
  }
};
