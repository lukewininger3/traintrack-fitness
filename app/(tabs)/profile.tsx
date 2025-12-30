import { router } from 'expo-router';
import { Calendar, Database, LogOut, Mail, Settings, Trash2, User as UserIcon } from 'lucide-react-native';
import React, { useState } from 'react';
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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loadingSample, setLoadingSample] = useState(false);
  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all workouts from cloud and local storage. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingSample(true);
              
              // Delete from Supabase cloud
              const { error: cloudError } = await supabase
                .from('workouts')
                .delete()
                .eq('user_id', (user as any)?.id);

              if (cloudError) throw cloudError;

              // Clear local cache
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <UserIcon size={48} color="#fff" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={20} color="#3B82F6" strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{(user as any)?.email || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color="#10B981" strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {(user as any)?.created_at ? formatDate((user as any).created_at) : 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <UserIcon size={20} color="#8B5CF6" strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValueSmall}>
                {(user as any)?.id?.substring(0, 8) || 'Unknown'}...
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Developer Settings</Text>
          </View>

          <Pressable 
            style={styles.settingRow}
            onPress={handleLoadSampleData}
            disabled={loadingSample}
          >
            <Database size={20} color="#F59E0B" strokeWidth={2} />
            <Text style={styles.settingText}>Load Sample Data</Text>
            {loadingSample && <ActivityIndicator size="small" color="#F59E0B" />}
          </Pressable>

          <View style={styles.divider} />
          <View style={styles.divider} />

          <Pressable 
            style={styles.settingRow}
            onPress={handleClearAllData}
            disabled={loadingSample}
          >
            <Trash2 size={20} color="#EF4444" strokeWidth={2} />
            <Text style={[styles.settingText, { color: '#EF4444' }]}>Clear All Data</Text>
            {loadingSample && <ActivityIndicator size="small" color="#EF4444" />}
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.settingRow}>
            <Settings size={20} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.settingText}>App Preferences</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#fff" strokeWidth={2} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>TrainTracks v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with 💪 for fitness tracking</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoValueSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  comingSoon: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#4B5563',
    marginVertical: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#4B5563',
  },
});
