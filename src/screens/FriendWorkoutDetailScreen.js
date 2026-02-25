import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  Activity,
  ArrowLeft,
  Bike,
  Dumbbell,
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
  Share2,
  User,
  Waves,
  X,
} from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import { likeWorkout, addComment, getComments } from '../utils/socialStorage';
import { saveTemplate } from '../utils/workoutTemplates';

// Social colors
const SOCIAL_COLORS = {
  heart: '#B86B5A',
  heartDim: 'rgba(184, 107, 90, 0.15)',
};

// Get workout icon based on type
const getWorkoutIcon = (type) => {
  switch (type) {
    case 'Strength':
      return Dumbbell;
    case 'Running':
      return Activity;
    case 'Cycling':
      return Bike;
    case 'Swimming':
      return Waves;
    default:
      return Activity;
  }
};

export default function FriendWorkoutDetailScreen() {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const viewShotRef = useRef(null);
  const commentInputRef = useRef(null);

  // Parse activity data from params
  const activity = params.activity ? JSON.parse(params.activity) : null;
  const shouldFocusComment = params.focusComment === 'true';

  const [isLiked, setIsLiked] = useState(activity?.isLiked || false);
  const [likeCount, setLikeCount] = useState(activity?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isCommentFocused, setIsCommentFocused] = useState(false);

  useEffect(() => {
    if (activity?.id) {
      loadComments();
    }
  }, [activity?.id]);

  // Auto-focus comment input if requested
  useEffect(() => {
    if (shouldFocusComment && commentInputRef.current) {
      // Small delay to ensure the screen is fully rendered
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 300);
    }
  }, [shouldFocusComment]);

  // Dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setIsCommentFocused(false);
  };

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const data = await getComments(activity.id);
      setComments(data || []);
    } catch (error) {
      console.log('Error loading comments:', error);
      setComments([]);
    }
    setIsLoadingComments(false);
  };

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const result = await likeWorkout(activity.id);
      if (!result.success) {
        setIsLiked(!newLiked);
        setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (error) {
      setIsLiked(!newLiked);
      setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
    }
    setIsLiking(false);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSendingComment) return;

    Keyboard.dismiss();
    setIsSendingComment(true);
    try {
      const result = await addComment(activity.id, newComment.trim());
      if (result.success && result.comment) {
        setComments(prev => [...prev, { ...result.comment, timeAgo: 'Just now' }]);
        setNewComment('');
      } else {
        Alert.alert('Error', 'Failed to post comment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    }
    setIsSendingComment(false);
  };

  const handleShare = async () => {
    if (!viewShotRef.current) return;

    setIsSharing(true);
    try {
      // Small delay to ensure the view is ready for capture
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `${activity.friend?.name}'s Workout`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share workout');
    }
    setIsSharing(false);
  };

  const handleSaveTemplate = async () => {
    try {
      const template = {
        name: activity.workoutName,
        type: activity.workoutType,
        exercises: (activity.exercises || []).map(ex => ({
          name: ex.name,
          sets: (ex.sets || []).map(s => ({
            reps: s.reps || 0,
            weight: s.weight || 0,
          })),
        })),
      };

      const result = await saveTemplate(template);
      if (result.success) {
        Alert.alert('Saved!', `"${activity.workoutName}" has been saved as a template.`);
      } else {
        Alert.alert('Error', result.error || 'Failed to save template');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleViewProfile = () => {
    if (activity.friend?.id) {
      router.push({
        pathname: '/friend-profile',
        params: { userId: activity.friend.id, friendName: activity.friend.name }
      });
    }
  };

  if (!activity) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background.primary }]}>
        <View style={[styles.header, { borderBottomColor: themeColors.surface.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={themeColors.text.primary} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.text.secondary }]}>Workout not found</Text>
        </View>
      </View>
    );
  }

  const WorkoutIcon = getWorkoutIcon(activity.workoutType);
  const workoutTypeColor = themeColors.workoutTypes[activity.workoutType] || themeColors.workoutTypes.Other;
  const hasExercises = activity.exercises && activity.exercises.length > 0;

  // Get workout summary for cardio (don't show exercise count for strength)
  const getWorkoutSummary = () => {
    const isCardio = ['Running', 'Cycling', 'Swimming'].includes(activity.workoutType);
    const exercises = activity.exercises || [];

    if (isCardio) {
      let totalDistance = 0;
      let totalTime = 0;
      exercises.forEach(ex => {
        (ex.sets || []).forEach(set => {
          totalDistance += parseFloat(set.distance) || 0;
          totalTime += parseFloat(set.time) || 0;
        });
      });
      if (totalTime === 0 && activity.duration) totalTime = activity.duration;

      const parts = [];
      if (totalDistance > 0) parts.push(`${totalDistance.toFixed(1)} mi`);
      if (totalTime > 0) parts.push(`${Math.round(totalTime)} min`);
      if (totalDistance > 0 && totalTime > 0) {
        const pace = totalTime / totalDistance;
        const paceMin = Math.floor(pace);
        const paceSec = Math.round((pace - paceMin) * 60);
        parts.push(`${paceMin}:${paceSec.toString().padStart(2, '0')} /mi`);
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }
    return null; // Don't show summary for strength workouts
  };

  const workoutSummary = getWorkoutSummary();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.surface.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={themeColors.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text.secondary }]}>WORKOUT</Text>
        <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
          <MoreVertical size={22} color={themeColors.text.primary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuDropdown, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            {hasExercises && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleSaveTemplate();
                }}
              >
                <Text style={[styles.menuItemText, { color: themeColors.text.primary }]}>Save as Template</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={0}
      >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissKeyboard}
          >
          {/* Card-style Workout Info */}
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={[styles.viewShotContainer, { backgroundColor: themeColors.background.primary }]}>
            <Animated.View entering={FadeIn.delay(100)} style={[styles.workoutCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              {/* User Header */}
              <Pressable onPress={handleViewProfile} style={styles.cardHeader}>
                <View style={[styles.avatarContainer, { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.border }]}>
                  {activity.friend?.profilePicture ? (
                    <Image
                      source={{ uri: activity.friend.profilePicture }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <User size={20} color={themeColors.accent.primary} strokeWidth={1.5} />
                  )}
                </View>
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: themeColors.text.primary }]}>{activity.friend?.name || 'Unknown'}</Text>
                    <View style={[styles.workoutTypeIcon, { backgroundColor: workoutTypeColor + '25' }]}>
                      <WorkoutIcon size={12} color={workoutTypeColor} strokeWidth={2.5} />
                    </View>
                  </View>
                  <Text style={[styles.userTime, { color: themeColors.text.tertiary }]}>{activity.timeAgo}</Text>
                </View>
              </Pressable>

              {/* Workout Title */}
              <View style={styles.workoutTitleSection}>
                <Text style={[styles.workoutName, { color: themeColors.text.primary }]}>{activity.workoutName}</Text>
                {workoutSummary && (
                  <Text style={[styles.workoutSummary, { color: themeColors.text.secondary }]}>{workoutSummary}</Text>
                )}
              </View>

              {/* Exercises */}
              <View style={styles.exercisesSection}>
                {hasExercises ? (
                  <View style={styles.exercisesList}>
                    {activity.exercises.map((exercise, idx) => {
                      const isCardioWorkout = ['Running', 'Cycling', 'Swimming'].includes(activity.workoutType);
                      const firstSet = exercise.sets?.[0];
                      const hasCardioFields = firstSet && ('distance' in firstSet || 'time' in firstSet || 'pace' in firstSet);
                      const hasStrengthFields = firstSet && ('weight' in firstSet || 'reps' in firstSet);
                      const isCardioExercise = isCardioWorkout || (hasCardioFields && !hasStrengthFields);
                      const sets = exercise.sets || [];

                      return (
                        <View key={idx} style={[styles.exerciseItem, { backgroundColor: themeColors.background.tertiary }]}>
                          <Text style={[styles.exerciseName, { color: themeColors.text.primary }]}>{exercise.name}</Text>
                          <View style={styles.setsContainer}>
                            {sets.length > 0 ? (
                              sets.map((set, setIdx) => {
                                let setDisplay;
                                if (isCardioExercise) {
                                  const parts = [];
                                  if (set.distance > 0) parts.push(`${set.distance} mi`);
                                  if (set.time > 0) parts.push(`${set.time} min`);
                                  if (set.pace > 0) {
                                    const paceMin = Math.floor(set.pace);
                                    const paceSec = Math.round((set.pace - paceMin) * 60);
                                    parts.push(`${paceMin}:${paceSec.toString().padStart(2, '0')} /mi`);
                                  }
                                  setDisplay = parts.length > 0 ? parts.join(' • ') : 'Completed';
                                } else {
                                  const weight = parseFloat(set.weight) || 0;
                                  const reps = parseInt(set.reps) || 0;
                                  const weightDisplay = `${weight} lbs`;
                                  setDisplay = `${weightDisplay} × ${reps}`;
                                }
                                return (
                                  <View key={setIdx} style={[styles.setRow, { backgroundColor: themeColors.background.tertiary }]}>
                                    <Text style={[styles.setNumber, { color: themeColors.text.tertiary }]}>{setIdx + 1}</Text>
                                    <Text style={[styles.setDetails, { color: themeColors.text.primary }]}>{setDisplay}</Text>
                                  </View>
                                );
                              })
                            ) : (
                              <View style={[styles.setRow, { backgroundColor: themeColors.background.tertiary }]}>
                                <Text style={[styles.setDetails, { color: themeColors.text.primary }]}>No sets recorded</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noExercisesContainer}>
                    <Activity size={40} color={themeColors.text.tertiary} strokeWidth={1.5} />
                    <Text style={[styles.noExercisesText, { color: themeColors.text.tertiary }]}>
                      {['Running', 'Cycling', 'Swimming'].includes(activity.workoutType)
                        ? 'Cardio workout completed'
                        : 'No exercise details available'}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </ViewShot>

          {/* Comments Section - Always visible below exercises */}
          <View style={styles.commentsSection}>
            {comments.length > 0 && (
              <View style={styles.commentsList}>
                {comments.map((comment, idx) => (
                  <View key={comment.id || idx} style={styles.commentItem}>
                    <View style={[styles.commentAvatar, { backgroundColor: themeColors.accent.primaryDim }]}>
                      {comment.user?.profilePicture ? (
                        <Image
                          source={{ uri: comment.user.profilePicture }}
                          style={styles.commentAvatarImage}
                        />
                      ) : (
                        <User size={18} color={themeColors.accent.primary} strokeWidth={1.5} />
                      )}
                    </View>
                    <View style={[styles.commentContent, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={[styles.commentAuthor, { color: themeColors.text.primary }]}>{comment.user?.name || 'Unknown'}</Text>
                        <Text style={[styles.commentTime, { color: themeColors.text.tertiary }]}>{comment.timeAgo || ''}</Text>
                      </View>
                      <Text style={[styles.commentText, { color: themeColors.text.secondary }]}>{comment.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {isLoadingComments && (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color={themeColors.accent.primary} />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Actions - Comment Input + Like/Comment/Share */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm, borderTopColor: themeColors.surface.border, backgroundColor: themeColors.background.primary }]}>
          {/* Comment Input */}
          <View style={[styles.commentInputContainer, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <TextInput
              ref={commentInputRef}
              style={[styles.commentInput, { color: themeColors.text.primary }]}
              placeholder="Write a comment..."
              placeholderTextColor={themeColors.text.tertiary}
              value={newComment}
              onChangeText={setNewComment}
              onFocus={() => setIsCommentFocused(true)}
              onBlur={() => setIsCommentFocused(false)}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSendComment}
              style={[
                styles.sendCommentButton,
                { backgroundColor: themeColors.accent.primary },
                (!newComment.trim() || isSendingComment) && { backgroundColor: themeColors.surface.border }
              ]}
              disabled={!newComment.trim() || isSendingComment}
            >
              {isSendingComment ? (
                <ActivityIndicator size="small" color={themeColors.text.inverse} />
              ) : (
                <Send size={18} color={themeColors.text.inverse} strokeWidth={2} />
              )}
            </Pressable>
          </View>

          {/* Action Buttons - hidden when typing */}
          {!isCommentFocused && (
            <View style={styles.bottomActions}>
              <Pressable onPress={handleLike} style={styles.bottomActionButton} disabled={isLiking}>
                <Heart
                  size={22}
                  color={isLiked ? SOCIAL_COLORS.heart : themeColors.text.secondary}
                  fill={isLiked ? SOCIAL_COLORS.heart : 'transparent'}
                  strokeWidth={2}
                />
                {likeCount > 0 && (
                  <Text style={[styles.bottomActionCount, { color: themeColors.text.secondary }, isLiked && { color: SOCIAL_COLORS.heart }]}>
                    {likeCount}
                  </Text>
                )}
              </Pressable>

              <Pressable style={styles.bottomActionButton}>
                <MessageCircle size={22} color={themeColors.text.secondary} strokeWidth={2} />
                {comments.length > 0 && (
                  <Text style={[styles.bottomActionCount, { color: themeColors.text.secondary }]}>{comments.length}</Text>
                )}
              </Pressable>

              <Pressable onPress={handleShare} style={styles.bottomActionButton} disabled={isSharing}>
                {isSharing ? (
                  <ActivityIndicator size="small" color={themeColors.text.secondary} />
                ) : (
                  <Share2 size={22} color={themeColors.text.secondary} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    letterSpacing: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // Menu Dropdown
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: SPACING.md,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.sm,
    paddingBottom: SPACING.xl,
  },

  // ViewShot
  viewShotContainer: {
    backgroundColor: COLORS.background.primary,
  },

  // Card-style layout
  workoutCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface.border,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  userName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  workoutTypeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },


  // Workout Title Section
  workoutTitleSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  workoutName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontSize: 18,
    marginBottom: 4,
  },
  workoutSummary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontSize: 13,
  },

  // Exercises
  exercisesSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  exercisesList: {
    gap: SPACING.sm,
  },
  exerciseItem: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
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
    backgroundColor: COLORS.background.tertiary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  setNumber: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    width: 24,
    fontWeight: '600',
  },
  setDetails: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  noExercisesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  noExercisesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Comments
  commentsSection: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
  },
  commentsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  commentsList: {
    gap: SPACING.sm,
  },
  commentItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  commentTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 10,
  },
  commentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  // Bottom Bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    backgroundColor: COLORS.background.primary,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    maxHeight: 80,
    minHeight: 36,
    fontSize: 14,
  },
  sendCommentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: COLORS.surface.border,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xs,
  },
  bottomActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  bottomActionCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
