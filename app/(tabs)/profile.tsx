import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Camera, ChevronRight, Database, Dumbbell, Eye, EyeOff, LogOut, Mail, Settings, Trash2, Trophy, User as UserIcon, Users } from 'lucide-react-native';
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
import { initializeSampleData } from '../../src/utils/initSampleData';
import { clearLocalWorkouts } from '../../src/utils/storage';
import { uploadProfilePicture } from '../../src/utils/socialStorage';
import { formatDateLong } from '../../src/utils/dateFormatter';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../src/theme/design';

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
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
      await refreshProfile();
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            disabled={isUploadingPhoto}
          >
            <View style={styles.avatarContainer}>
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
            <View style={styles.cameraButton}>
              <Camera size={14} color={COLORS.text.primary} strokeWidth={2.5} />
            </View>
          </Pressable>
          <Text style={styles.title}>PROFILE</Text>
          <Text style={styles.subtitle}>Manage your account</Text>
        </View>

        {/* Account Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ACCOUNT INFO</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.tertiary.dim }]}>
              <Mail size={18} color={COLORS.tertiary.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{(user as any)?.email || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <Calendar size={18} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>MEMBER SINCE</Text>
              <Text style={styles.infoValue}>
                {(user as any)?.created_at ? formatDateLong((user as any).created_at) : 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.secondary.dim }]}>
              <UserIcon size={18} color={COLORS.secondary.primary} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>USER ID</Text>
              <Text style={styles.infoValueSmall}>
                {(user as any)?.id?.substring(0, 12) || 'Unknown'}...
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Records Card */}
        <Pressable
          style={styles.card}
          onPress={() => router.push('/personal-records' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={styles.prIconContainer}>
              <Trophy size={28} color={COLORS.warning} strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={styles.prTitle}>PERSONAL RECORDS</Text>
              <Text style={styles.prSubtitle}>
                {prStats?.totalPRs ? `${prStats.totalPRs} PRs tracked` : 'Track your best lifts'}
              </Text>
            </View>
            <View style={styles.prStatsContainer}>
              {prStats?.recentPRs ? (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>+{prStats.recentPRs}</Text>
                  <Text style={styles.prBadgeLabel}>THIS MONTH</Text>
                </View>
              ) : null}
              <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
            </View>
          </View>
        </Pressable>

        {/* Trophies & Achievements Card */}
        <Pressable
          style={styles.card}
          onPress={() => router.push('/trophy' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={[styles.prIconContainer, { backgroundColor: 'rgba(147, 51, 234, 0.15)' }]}>
              <Trophy size={28} color="#9333EA" strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={styles.prTitle}>TROPHIES</Text>
              <Text style={styles.prSubtitle}>View your achievements</Text>
            </View>
            <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Custom Exercises Card */}
        <Pressable
          style={styles.card}
          onPress={() => router.push('/custom-exercises' as any)}
        >
          <View style={styles.prCardContent}>
            <View style={[styles.prIconContainer, { backgroundColor: COLORS.tertiary.dim }]}>
              <Dumbbell size={28} color={COLORS.tertiary.primary} strokeWidth={2} />
            </View>
            <View style={styles.prTextContent}>
              <Text style={styles.prTitle}>CUSTOM EXERCISES</Text>
              <Text style={styles.prSubtitle}>Create and manage your exercises</Text>
            </View>
            <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Social Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>SOCIAL</Text>
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
              <Text style={styles.settingText}>Share Workouts</Text>
              <Text style={styles.settingDescription}>
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
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: COLORS.tertiary.dim }]}>
                  <Users size={18} color={COLORS.tertiary.primary} strokeWidth={2} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>USERNAME</Text>
                  <Text style={styles.infoValue}>@{profile.username}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Developer Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>DEVELOPER</Text>
          </View>

          <Pressable
            style={styles.settingRow}
            onPress={handleLoadSampleData}
            disabled={loadingSample}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Database size={18} color={COLORS.warning} strokeWidth={2} />
            </View>
            <Text style={styles.settingText}>Load Sample Data</Text>
            {loadingSample ? (
              <ActivityIndicator size="small" color={COLORS.warning} />
            ) : (
              <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={handleClearAllData}
            disabled={loadingSample}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 59, 59, 0.15)' }]}>
              <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.error }]}>Clear All Data</Text>
            {loadingSample ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={[styles.settingRow, { opacity: 0.5 }]} disabled>
            <View style={[styles.settingIcon, { backgroundColor: COLORS.surface.card }]}>
              <Settings size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            </View>
            <Text style={styles.settingText}>App Preferences</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>SOON</Text>
            </View>
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>TrainTrack v1.0.0</Text>
          <Text style={styles.footerText}>Built for athletes</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
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
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.accent.primary,
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
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.primary,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  cardTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
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
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  prTextContent: {
    flex: 1,
  },
  prTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  prSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  prStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  prBadge: {
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  prBadgeText: {
    ...TYPOGRAPHY.statSmall,
    fontSize: 14,
    color: COLORS.accent.primary,
  },
  prBadgeLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
    color: COLORS.accent.primary,
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
    color: COLORS.text.tertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  infoValueSmall: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
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
    color: COLORS.text.primary,
    flex: 1,
  },
  settingDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
  },
  comingSoonBadge: {
    backgroundColor: COLORS.surface.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  comingSoonText: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  signOutText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerVersion: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
});
