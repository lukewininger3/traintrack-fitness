import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Activity,
  ArrowLeft,
  Calendar,
  Camera,
  Flame,
  Heart,
  Loader,
  Save,
  Trophy,
  User,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { getUserProfileWithStats, uploadProfilePicture } from '../utils/socialStorage';
import { saveTemplate } from '../utils/workoutTemplates';
import { useAuth } from '../contexts/AuthContext';

const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
};

const formatJoinDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Workout Detail Modal with Save Template option
const WorkoutDetailModal = ({ workout, visible, onClose, onSaveTemplate }) => {
  if (!workout) return null;

  const workoutTypeColor = COLORS.workoutTypes[workout.type] || COLORS.workoutTypes.Other;
  const hasExercises = workout.exercises && workout.exercises.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              entering={FadeInDown.springify().damping(15)}
              style={styles.workoutDetailModal}
            >
              <View style={styles.modalHandle} />

              <View style={[styles.workoutDetailBanner, { backgroundColor: `${workoutTypeColor}10`, borderColor: `${workoutTypeColor}30` }]}>
                <Text style={[styles.workoutDetailName, { color: workoutTypeColor }]}>{workout.name}</Text>
                <View style={styles.workoutDetailStats}>
                  <Text style={styles.workoutDetailStat}>{workout.type}</Text>
                  {workout.duration > 0 && (
                    <>
                      <Text style={styles.workoutDetailStat}>•</Text>
                      <Text style={styles.workoutDetailStat}>{workout.duration} min</Text>
                    </>
                  )}
                  {hasExercises && (
                    <>
                      <Text style={styles.workoutDetailStat}>•</Text>
                      <Text style={styles.workoutDetailStat}>{workout.exercises.length} exercises</Text>
                    </>
                  )}
                </View>
              </View>

              {hasExercises ? (
                <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
                  {workout.exercises.map((exercise, idx) => {
                    // Check if this is a cardio exercise (has distance or time but no meaningful weight/reps)
                    const firstSet = exercise.sets?.[0];
                    const isCardioExercise = firstSet && (
                      (firstSet.distance > 0 || firstSet.time > 0) &&
                      (!firstSet.reps || firstSet.reps === 0)
                    );

                    return (
                      <View key={idx} style={styles.exerciseItem}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <View style={styles.setsContainer}>
                          {(exercise.sets || []).map((set, setIdx) => {
                            // Format based on exercise type
                            let setDisplay;
                            if (isCardioExercise) {
                              // Cardio: show distance and time with pace
                              const dist = set.distance || 0;
                              const time = set.time || 0;
                              const pace = dist > 0 && time > 0 ? time / dist : 0;
                              const paceFormatted = pace > 0 ? (() => {
                                const totalSeconds = Math.round(pace * 60);
                                const mins = Math.floor(totalSeconds / 60);
                                const secs = totalSeconds % 60;
                                return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
                              })() : '';
                              setDisplay = `${dist} mi • ${time} min${paceFormatted ? ` • ${paceFormatted}` : ''}`;
                            } else {
                              // Strength: show weight and reps
                              const weightDisplay = set.weight > 0 ? `${set.weight} lbs` : 'BW';
                              setDisplay = `${weightDisplay} × ${set.reps || 0}`;
                            }

                            return (
                              <View key={setIdx} style={styles.setRow}>
                                <Text style={styles.setNumber}>{setIdx + 1}</Text>
                                <Text style={styles.setDetails}>{setDisplay}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.noExercisesContainer}>
                  <Activity size={32} color={COLORS.text.tertiary} strokeWidth={1.5} />
                  <Text style={styles.noExercisesText}>No exercise details available</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                {hasExercises && (
                  <Pressable style={styles.saveTemplateButton} onPress={() => onSaveTemplate(workout)}>
                    <Save size={18} color={COLORS.accent.primary} strokeWidth={2} />
                    <Text style={styles.saveTemplateText}>Save as Template</Text>
                  </Pressable>
                )}
                <Pressable style={styles.modalCloseButton} onPress={onClose}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userId, friendName } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const data = await getUserProfileWithStats(userId);
    setProfile(data);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const handleUpload = async (imageUri) => {
    setIsUploadingPhoto(true);
    try {
      const result = await uploadProfilePicture(imageUri);
      if (result.success) {
        // Update local profile state with new avatar URL
        setProfile(prev => ({
          ...prev,
          avatarUrl: result.avatarUrl,
        }));
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

  const handleSaveAsTemplate = async (workout) => {
    setSavingTemplate(true);
    try {
      const template = {
        name: workout.name,
        type: workout.type,
        exercises: workout.exercises.map(ex => ({
          name: ex.name,
          sets: (ex.sets || []).map(s => ({
            reps: s.reps,
            weight: s.weight || 0,
          })),
        })),
      };

      const result = await saveTemplate(template);
      if (result.success) {
        Alert.alert('Saved!', `"${workout.name}" has been saved as a template.`);
        setSelectedWorkout(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to save template');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={48} color={COLORS.accent.primary} strokeWidth={1.5} />
              </View>
            )}
            {isUploadingPhoto && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={COLORS.text.primary} />
              </View>
            )}
            {isOwnProfile && (
              <Pressable
                style={styles.cameraButton}
                onPress={handlePickImage}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Loader size={16} color={COLORS.text.primary} strokeWidth={2} />
                ) : (
                  <Camera size={16} color={COLORS.text.primary} strokeWidth={2} />
                )}
              </Pressable>
            )}
          </View>
          <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.joinedContainer}>
            <Calendar size={14} color={COLORS.text.tertiary} strokeWidth={2} />
            <Text style={styles.joinedText}>Joined {formatJoinDate(profile.createdAt)}</Text>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <Zap size={20} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.streakDim }]}>
              <Flame size={20} color={COLORS.streak} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.weekStreak}</Text>
            <Text style={styles.statLabel}>WEEK STREAK</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.accent.primaryDim }]}>
              <Trophy size={20} color={COLORS.accent.primary} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.stats.highestWeekStreak}</Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>
        </Animated.View>

        {/* Shared Workouts */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isOwnProfile ? 'YOUR SHARED WORKOUTS' : 'SHARED WORKOUTS'}
          </Text>

          {profile.sharedWorkouts.length > 0 ? (
            <View style={styles.workoutsList}>
              {profile.sharedWorkouts.map((workout, index) => {
                const typeColor = COLORS.workoutTypes[workout.type] || COLORS.workoutTypes.Other;
                return (
                  <Pressable
                    key={workout.id}
                    onPress={() => setSelectedWorkout(workout)}
                  >
                    <Animated.View
                      entering={FadeInDown.delay(350 + index * 50)}
                      style={styles.workoutCard}
                    >
                      <View style={[styles.workoutTypeIndicator, { backgroundColor: typeColor }]} />
                      <View style={styles.workoutContent}>
                        <Text style={styles.workoutName}>{workout.name}</Text>
                        <View style={styles.workoutMeta}>
                          <Text style={[styles.workoutType, { color: typeColor }]}>{workout.type}</Text>
                          <Text style={styles.workoutDot}>•</Text>
                          <Text style={styles.workoutTime}>{getTimeAgo(workout.sharedAt)}</Text>
                          {workout.exercises.length > 0 && (
                            <>
                              <Text style={styles.workoutDot}>•</Text>
                              <Text style={styles.workoutTime}>{workout.exercises.length} exercises</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <View style={styles.workoutLikes}>
                        <Heart size={14} color={COLORS.text.tertiary} strokeWidth={2} />
                        <Text style={styles.likesCount}>{workout.likes}</Text>
                      </View>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyWorkouts}>
              <Activity size={32} color={COLORS.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>
                {isOwnProfile
                  ? "You haven't shared any workouts yet"
                  : "No shared workouts yet"}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <WorkoutDetailModal
        workout={selectedWorkout}
        visible={selectedWorkout !== null}
        onClose={() => setSelectedWorkout(null)}
        onSaveTemplate={handleSaveAsTemplate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.accent.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 3,
    borderColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    fontSize: 36,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.primary,
  },
  displayName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  username: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  joinedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
    fontSize: 24,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    fontSize: 9,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },

  // Workouts List
  workoutsList: {
    gap: SPACING.sm,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  workoutTypeIndicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  workoutContent: {
    flex: 1,
    padding: SPACING.md,
  },
  workoutName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  workoutType: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  workoutDot: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  workoutTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  workoutLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: SPACING.md,
  },
  likesCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  emptyWorkouts: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  workoutDetailModal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.surface.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  workoutDetailBanner: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  workoutDetailName: {
    ...TYPOGRAPHY.h3,
    marginBottom: 4,
  },
  workoutDetailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  workoutDetailStat: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  exercisesList: {
    flex: 1,
    maxHeight: '50%',
  },
  exerciseItem: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  setsContainer: {
    gap: SPACING.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  setNumber: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    width: 20,
  },
  setDetails: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  noExercisesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  noExercisesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  modalActions: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  saveTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    paddingVertical: SPACING.md,
  },
  saveTemplateText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  modalCloseButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  modalCloseText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
});
