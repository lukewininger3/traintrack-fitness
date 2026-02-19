import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Camera, ChevronRight, Database, Dumbbell, Eye, EyeOff, LogOut, Mail, Moon, Settings, Sun, Trash2, Trophy, User as UserIcon, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { clearAllPersonalRecords, getPRStats } from '../../src/utils/personalRecords';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { initializeSampleData } from '../../src/utils/initSampleData';
import { clearLocalWorkouts } from '../../src/utils/storage';
import { uploadProfilePicture } from '../../src/utils/socialStorage';
import { formatDateLong } from '../../src/utils/dateFormatter';
import { TYPOGRAPHY, SPACING, RADIUS, DARK_COLORS } from '../../src/theme/design';

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { isDark, colors: COLORS, toggleTheme } = useTheme();
  const [loadingSample, setLoadingSample] = useState(false);
  const [prStats, setPRStats] = useState<{ totalPRs: number; recentPRs: number } | null>(null);
  const [shareWorkouts, setShareWorkouts] = useState(true);
  const [updatingShare, setUpdatingShare] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
              setLoadingSample(true);
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
              setLoadingSample(false);
            } catch (error) {
              console.error('Clear error:', error);
              Alert.alert('Error', 'Failed to clear data');
              setLoadingSample(false);
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

  const handleLoadSampleData = async () => {
    Alert.alert(
      'Load Sample Data',
      'This will create sample workouts for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Sample Data',
          onPress: async () => {
            setLoadingSample(true);
            try {
              await initializeSampleData();
              Alert.alert('Success', 'Sample data loaded successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to load sample data');
            }
            setLoadingSample(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLORS.background.primary }]} showsVerticalScrollIndicator={false}>
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

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.secondary.dim }]}>
              <UserIcon size={18} color={COLORS.secondary.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>USER ID</Text>
              <Text style={[styles.infoValueSmall, { color: COLORS.text.secondary }]}>
                {(user as any)?.id?.substring(0, 12) || 'Unknown'}...
              </Text>
            </View>
          </View>
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

          {profile?.username && (
            <>
              <View style={[styles.divider, { backgroundColor: COLORS.surface.border }]} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: COLORS.tertiary.dim }]}>
                  <Users size={18} color={COLORS.tertiary.primary} strokeWidth={2} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: COLORS.text.tertiary }]}>USERNAME</Text>
                  <Text style={[styles.infoValue, { color: COLORS.text.primary }]}>@{profile.username}</Text>
                </View>
              </View>
            </>
          )}
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
            <Text style={[styles.cardTitle, { color: COLORS.text.secondary }]}>DEVELOPER</Text>
          </View>

          <Pressable
            style={styles.settingRow}
            onPress={handleLoadSampleData}
            disabled={loadingSample}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.warningDim }]}>
              <Database size={18} color={COLORS.warning} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.text.primary }]}>Load Sample Data</Text>
            {loadingSample ? (
              <ActivityIndicator size="small" color={COLORS.warning} />
            ) : (
              <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>

          <View style={[styles.divider, { backgroundColor: COLORS.surface.border }]} />

          <Pressable
            style={styles.settingRow}
            onPress={handleClearAllData}
            disabled={loadingSample}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.errorDim }]}>
              <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.error }]}>Clear All Data</Text>
            {loadingSample ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>

          <View style={[styles.divider, { backgroundColor: COLORS.surface.border }]} />

          <Pressable style={[styles.settingRow, { opacity: 0.5 }]} disabled>
            <View style={[styles.settingIcon, { backgroundColor: COLORS.surface.cardHover }]}>
              <Settings size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.text.primary }]}>App Preferences</Text>
            <View style={[styles.comingSoonBadge, { backgroundColor: COLORS.surface.cardHover }]}>
              <Text style={[styles.comingSoonText, { color: COLORS.text.tertiary }]}>SOON</Text>
            </View>
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
    </ScrollView>
  );
}

// Use DARK_COLORS as fallback for static styles - dynamic colors applied inline
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxxl,
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
});
