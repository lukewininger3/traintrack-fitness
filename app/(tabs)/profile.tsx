import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Camera, ChevronRight, Dumbbell, Eye, EyeOff, LogOut, Mail, Moon, Settings, Sun, Trash2, Trophy, User as UserIcon, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { clearAllPersonalRecords, getPRStats } from '../../src/utils/personalRecords';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { clearLocalWorkouts } from '../../src/utils/storage';
import { uploadProfilePicture } from '../../src/utils/socialStorage';
import { formatDateLong } from '../../src/utils/dateFormatter';
import { TYPOGRAPHY, SPACING, RADIUS, DARK_COLORS } from '../../src/theme/design';

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { isDark, colors: COLORS, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isClearing, setIsClearing] = useState(false);
  const [prStats, setPRStats] = useState<{ totalPRs: number; recentPRs: number } | null>(null);
  const [shareWorkouts, setShareWorkouts] = useState(true);
  const [updatingShare, setUpdatingShare] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);

  useEffect(() => {
    loadPRStats();
  }, []);

  // Load avatar URL from profile
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  // Load share preference from profile
  useEffect(() => {
    if (profile) {
      setShareWorkouts(profile.share_workouts !== false);
    }
  }, [profile]);

  const loadPRStats = async () => {
    const stats = await getPRStats();
    setPRStats(stats);
  };

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload a profile picture.'
      );
      return;
    }

    // Show options for camera or gallery
    Alert.alert(
      'Update Profile Picture',
      'Choose how to update your photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus.status !== 'granted') {
              Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await handleUpload(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await handleUpload(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUpload = async (imageUri: string) => {
    setIsUploadingPhoto(true);
    try {
      const result = await uploadProfilePicture(imageUri);
      if (result.success && result.avatarUrl) {
        setAvatarUrl(result.avatarUrl);
        await refreshProfile();
        Alert.alert('Success', 'Profile picture updated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleToggleShare = async (value: boolean) => {
    setShareWorkouts(value);
    setUpdatingShare(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ share_workouts: value })
        .eq('id', (user as any)?.id);

      if (error) throw error;
      // Don't call refreshProfile() - it causes navigation issues
      // Local state is already updated
    } catch (error) {
      console.error('Error updating share preference:', error);
      setShareWorkouts(!value); // Revert on error
      Alert.alert('Error', 'Failed to update privacy setting');
    } finally {
      setUpdatingShare(false);
    }
  };

  const handleEditUsername = () => {
    setNewUsername(profile?.username || '');
    setShowUsernameModal(true);
  };

  const handleEditDisplayName = () => {
    setNewDisplayName(profile?.display_name || '');
    setShowDisplayNameModal(true);
  };

  const handleUpdateDisplayName = async () => {
    const trimmedName = newDisplayName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    if (trimmedName.length > 30) {
      Alert.alert('Error', 'Display name must be 30 characters or less');
      return;
    }

    if (trimmedName === profile?.display_name) {
      setShowDisplayNameModal(false);
      return;
    }

    setIsUpdatingDisplayName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmedName })
        .eq('id', (user as any)?.id);

      if (error) throw error;

      await refreshProfile();
      setShowDisplayNameModal(false);
      Alert.alert('Success', 'Display name updated successfully!');
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Error', 'Failed to update display name. Please try again.');
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  const handleUpdateUsername = async () => {
    const trimmedUsername = newUsername.trim().toLowerCase();

    if (!trimmedUsername) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (trimmedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (trimmedUsername.length > 20) {
      Alert.alert('Error', 'Username must be 20 characters or less');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    if (trimmedUsername === profile?.username) {
      setShowUsernameModal(false);
      return;
    }

    setIsUpdatingUsername(true);
    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', (user as any)?.id)
        .single();

      if (existing) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose another.');
        setIsUpdatingUsername(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername })
        .eq('id', (user as any)?.id);

      if (error) throw error;

      await refreshProfile();
      setShowUsernameModal(false);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all workouts and personal records from cloud and local storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              // Clear cloud workouts
              const { error: cloudError } = await supabase
                .from('workouts')
                .delete()
                .eq('user_id', (user as any)?.id);
              if (cloudError) throw cloudError;

              // Clear local workouts
              await clearLocalWorkouts();

              // Clear personal records (local + cloud)
              await clearAllPersonalRecords();

              // Reset PR stats in UI immediately
              setPRStats({ totalPRs: 0, recentPRs: 0 });

              Alert.alert('Success', 'All data cleared! Restart the app to see changes.');
              setIsClearing(false);
            } catch (error) {
              console.error('Clear error:', error);
              Alert.alert('Error', 'Failed to clear data');
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth/login' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background.primary }]} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            disabled={isUploadingPhoto}
          >
            <View style={[styles.avatarContainer, { backgroundColor: COLORS.accent.primaryDim, borderColor: COLORS.accent.primary }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <UserIcon size={40} color={COLORS.accent.primary} strokeWidth={2} />
              )}
              {isUploadingPhoto && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color={COLORS.text.primary} />
                </View>
              )}
            </View>
            <View style={[styles.cameraButton, { backgroundColor: COLORS.accent.primary, borderColor: COLORS.background.primary }]}>
              <Camera size={14} color={COLORS.text.inverse} strokeWidth={2.5} />
            </View>
          </Pressable>
          <Text style={[styles.title, { color: COLORS.text.primary }]}>PROFILE</Text>
          <Text style={[styles.subtitle, { color: COLORS.text.secondary }]}>Manage your account</Text>
        </View>

        {/* Account Info Card */}
        <View style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: COLORS.surface.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text.secondary }]}>ACCOUNT INFO</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.tertiary.dim }]}>
              <Mail size={18} color={COLORS.tertiary.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>EMAIL</Text>
              <Text style={[styles.infoValue, { color: COLORS.text.primary }]}>{(user as any)?.email || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <Calendar size={18} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>MEMBER SINCE</Text>
              <Text style={[styles.infoValue, { color: COLORS.text.primary }]}>
                {(user as any)?.created_at ? formatDateLong((user as any).created_at) : 'Unknown'}
              </Text>
            </View>
          </View>

          <Pressable style={styles.infoRow} onPress={handleEditUsername}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.secondary.dim }]}>
              <UserIcon size={18} color={COLORS.secondary.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>USERNAME</Text>
              <Text style={[styles.infoValue, { color: COLORS.text.primary }]}>
                @{profile?.username || 'Set username'}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
          </Pressable>

          <Pressable style={styles.infoRow} onPress={handleEditDisplayName}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <UserIcon size={18} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>DISPLAY NAME</Text>
              <Text style={[styles.infoValue, { color: COLORS.text.primary }]}>
                {profile?.display_name || 'Set display name'}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Personal Records Card */}
        <Pressable
          style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}
          onPress={() => router.push('/personal-records' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={[styles.prIconContainer, { backgroundColor: COLORS.warningDim }]}>
              <Trophy size={28} color={COLORS.warning} strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={[styles.prTitle, { color: COLORS.text.primary }]}>PERSONAL RECORDS</Text>
              <Text style={[styles.prSubtitle, { color: COLORS.text.secondary }]}>
                {prStats?.totalPRs ? `${prStats.totalPRs} PRs tracked` : 'Track your best lifts'}
              </Text>
            </View>
            <View style={styles.prStatsContainer}>
              {prStats?.recentPRs ? (
                <View style={[styles.prBadge, { backgroundColor: COLORS.accent.primaryDim }]}>
                  <Text style={[styles.prBadgeText, { color: COLORS.accent.primary }]}>+{prStats.recentPRs}</Text>
                  <Text style={[styles.prBadgeLabel, { color: COLORS.accent.primary }]}>THIS MONTH</Text>
                </View>
              ) : null}
              <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
            </View>
          </View>
        </Pressable>

        {/* Trophies & Achievements Card */}
        <Pressable
          style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}
          onPress={() => router.push('/trophy' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={[styles.prIconContainer, { backgroundColor: 'rgba(147, 51, 234, 0.15)' }]}>
              <Trophy size={28} color="#9333EA" strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={[styles.prTitle, { color: COLORS.text.primary }]}>TROPHIES</Text>
              <Text style={[styles.prSubtitle, { color: COLORS.text.secondary }]}>View your achievements</Text>
            </View>
            <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Custom Exercises Card */}
        <Pressable
          style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}
          onPress={() => router.push('/custom-exercises' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={[styles.prIconContainer, { backgroundColor: COLORS.tertiary.dim }]}>
              <Dumbbell size={28} color={COLORS.tertiary.primary} strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={[styles.prTitle, { color: COLORS.text.primary }]}>CUSTOM EXERCISES</Text>
              <Text style={[styles.prSubtitle, { color: COLORS.text.secondary }]}>Create and manage your exercises</Text>
            </View>
            <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Social Settings Card */}
        <View style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: COLORS.surface.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text.secondary }]}>SOCIAL</Text>
          </View>

          <View style={styles.settingRowWithToggle}>
            <View style={[styles.settingIcon, { backgroundColor: shareWorkouts ? COLORS.accent.primaryDim : COLORS.surface.card }]}>
              {shareWorkouts ? (
                <Eye size={18} color={COLORS.accent.primary} strokeWidth={2} />
              ) : (
                <EyeOff size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              )}
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: COLORS.text.primary }]}>Share Workouts</Text>
              <Text style={[styles.settingDescription, { color: COLORS.text.tertiary }]}>
                {shareWorkouts ? 'Friends can see your workouts' : 'Your workouts are private'}
              </Text>
            </View>
            {updatingShare ? (
              <ActivityIndicator size="small" color={COLORS.accent.primary} />
            ) : (
              <Switch
                value={shareWorkouts}
                onValueChange={handleToggleShare}
                trackColor={{ false: COLORS.surface.border, true: COLORS.accent.primaryDim }}
                thumbColor={shareWorkouts ? COLORS.accent.primary : COLORS.text.tertiary}
              />
            )}
          </View>

        </View>

        {/* Appearance Card */}
        <View style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: COLORS.surface.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text.secondary }]}>APPEARANCE</Text>
          </View>

          <View style={styles.settingRowWithToggle}>
            <View style={[styles.settingIcon, { backgroundColor: isDark ? COLORS.accent.primaryDim : COLORS.warning + '20' }]}>
              {isDark ? (
                <Moon size={18} color={COLORS.accent.primary} strokeWidth={2} />
              ) : (
                <Sun size={18} color={COLORS.warning} strokeWidth={2} />
              )}
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: COLORS.text.primary }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: COLORS.text.tertiary }]}>
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: COLORS.surface.border, true: COLORS.accent.primaryDim }}
              thumbColor={isDark ? COLORS.accent.primary : COLORS.warning}
            />
          </View>
        </View>

        {/* Developer Settings */}
        <View style={[styles.card, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: COLORS.surface.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text.secondary }]}>SETTINGS</Text>
          </View>

          <Pressable style={styles.settingRow} onPress={() => router.push('/settings' as any)}>
            <View style={[styles.settingIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <Settings size={18} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.text.primary }]}>App Settings</Text>
            <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: COLORS.surface.border }]} />

          <Pressable
            style={styles.settingRow}
            onPress={handleClearAllData}
            disabled={isClearing}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.errorDim }]}>
              <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.error }]}>Clear All Data</Text>
            {isClearing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable style={[styles.signOutButton, { backgroundColor: COLORS.error }]} onPress={handleSignOut}>
          <LogOut size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
          <Text style={[styles.signOutText, { color: COLORS.text.inverse }]}>SIGN OUT</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerVersion, { color: COLORS.text.tertiary }]}>TrainTrack v1.0.0</Text>
          <Text style={[styles.footerText, { color: COLORS.text.tertiary }]}>Built for athletes</Text>
        </View>
      </View>

      {/* Username Edit Modal */}
      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: COLORS.background.secondary }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text.primary }]}>Change Username</Text>
            <Text style={[styles.modalSubtitle, { color: COLORS.text.secondary }]}>
              Choose a unique username (3-20 characters)
            </Text>
            <View style={[styles.usernameInputContainer, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
              <Text style={[styles.usernamePrefix, { color: COLORS.text.tertiary }]}>@</Text>
              <TextInput
                style={[styles.usernameInput, { color: COLORS.text.primary }]}
                value={newUsername}
                onChangeText={(text) => setNewUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                placeholderTextColor={COLORS.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus
              />
            </View>
            <Text style={[styles.usernameHint, { color: COLORS.text.tertiary }]}>
              Letters, numbers, and underscores only
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalCancelButton, { backgroundColor: COLORS.surface.card }]}
                onPress={() => setShowUsernameModal(false)}
                disabled={isUpdatingUsername}
              >
                <Text style={[styles.modalCancelText, { color: COLORS.text.secondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, { backgroundColor: COLORS.accent.primary }]}
                onPress={handleUpdateUsername}
                disabled={isUpdatingUsername}
              >
                {isUpdatingUsername ? (
                  <ActivityIndicator size="small" color={COLORS.text.inverse} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: COLORS.text.inverse }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Display Name Edit Modal */}
      <Modal
        visible={showDisplayNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisplayNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: COLORS.background.secondary }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text.primary }]}>Change Display Name</Text>
            <Text style={[styles.modalSubtitle, { color: COLORS.text.secondary }]}>
              This is how you'll appear to friends
            </Text>
            <View style={[styles.usernameInputContainer, { backgroundColor: COLORS.surface.card, borderColor: COLORS.surface.border }]}>
              <TextInput
                style={[styles.displayNameInput, { color: COLORS.text.primary }]}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="Your Name"
                placeholderTextColor={COLORS.text.tertiary}
                maxLength={30}
                autoFocus
              />
            </View>
            <Text style={[styles.usernameHint, { color: COLORS.text.tertiary }]}>
              Up to 30 characters
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalCancelButton, { backgroundColor: COLORS.surface.card }]}
                onPress={() => setShowDisplayNameModal(false)}
                disabled={isUpdatingDisplayName}
              >
                <Text style={[styles.modalCancelText, { color: COLORS.text.secondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, { backgroundColor: COLORS.accent.primary }]}
                onPress={handleUpdateDisplayName}
                disabled={isUpdatingDisplayName}
              >
                {isUpdatingDisplayName ? (
                  <ActivityIndicator size="small" color={COLORS.text.inverse} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: COLORS.text.inverse }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

// Use DARK_COLORS as fallback for static styles - dynamic colors applied inline
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 44,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  title: {
    ...TYPOGRAPHY.h2,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
  },

  // Card
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  cardTitle: {
    ...TYPOGRAPHY.label,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  // PR Card
  prCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  prTextContent: {
    flex: 1,
  },
  prTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: 2,
  },
  prSubtitle: {
    ...TYPOGRAPHY.caption,
  },
  prStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  prBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  prBadgeText: {
    ...TYPOGRAPHY.statSmall,
    fontSize: 14,
  },
  prBadgeLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    marginBottom: 2,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyBold,
  },
  infoValueSmall: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingRowWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  settingDescription: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  comingSoonBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  comingSoonText: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  signOutText: {
    ...TYPOGRAPHY.h4,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerVersion: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
  },

  // Username Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 120,
  },
  modalContent: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  usernamePrefix: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 16,
    paddingVertical: SPACING.md,
  },
  displayNameInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 16,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  usernameHint: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  modalCancelText: {
    ...TYPOGRAPHY.bodyBold,
  },
  modalSaveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  modalSaveText: {
    ...TYPOGRAPHY.bodyBold,
  },
});
