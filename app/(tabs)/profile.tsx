import { router } from 'expo-router';
import { Calendar, ChevronRight, Database, LogOut, Mail, Settings, Trash2, Trophy, User as UserIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { getPRStats } from '../../src/utils/personalRecords';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { initializeSampleData } from '../../src/utils/initSampleData';
import { clearLocalWorkouts } from '../../src/utils/storage';
import { formatDateLong } from '../../src/utils/dateFormatter';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../src/theme/design';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loadingSample, setLoadingSample] = useState(false);
  const [prStats, setPRStats] = useState<{ totalPRs: number; recentPRs: number } | null>(null);

  useEffect(() => {
    loadPRStats();
  }, []);

  const loadPRStats = async () => {
    const stats = await getPRStats();
    setPRStats(stats);
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all workouts from cloud and local storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingSample(true);
              const { error: cloudError } = await supabase
                .from('workouts')
                .delete()
                .eq('user_id', (user as any)?.id);
              if (cloudError) throw cloudError;
              await clearLocalWorkouts();
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
          <View style={styles.avatarContainer}>
            <UserIcon size={40} color={COLORS.accent.primary} strokeWidth={2} />
          </View>
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
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
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
