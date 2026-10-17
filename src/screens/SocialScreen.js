import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  Activity,
  Bike,
  Check,
  ChevronRight,
  Dumbbell,
  Heart,
  Loader,
  MessageCircle,
  Save,
  Search,
  Send,
  Share2,
  Sparkles,
  User,
  UserMinus,
  UserPlus,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';
import {
  getFriends,
  getActivityFeed,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  likeWorkout,
  getProfile,
  addComment,
  getComments,
} from '../utils/socialStorage';
import { saveTemplate } from '../utils/workoutTemplates';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Social-specific colors (earth tones)
const SOCIAL_COLORS = {
  connection: '#8B9A7B',  // Sage
  connectionDim: 'rgba(139, 154, 123, 0.15)',
  heart: '#B86B5A',       // Muted terracotta red
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

// Avatar component with profile picture support
const Avatar = ({ imageUrl, size = 48, delay = 0 }) => {
  const { colors: themeColors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={[styles.avatarContainer, { width: size, height: size }]}
    >
      <View style={[styles.avatarInner, { width: size, height: size, borderRadius: size / 2, backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.border }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <User size={size * 0.5} color={themeColors.accent.primary} strokeWidth={1.5} />
        )}
      </View>
    </Animated.View>
  );
};

// Workout Detail Modal with Comments and Share
const WorkoutDetailModal = ({ activity, visible, onClose, onSaveTemplate, onViewProfile, onRefreshFeed }) => {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('exercises'); // 'exercises' | 'comments'
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef(null);
  const bottomPadding = Math.max(insets.bottom, SPACING.lg);

  // Load comments when modal opens or tab changes
  React.useEffect(() => {
    if (visible && activity?.id) {
      loadComments();
    }
    return () => {
      if (!visible) {
        setComments([]);
        setActiveTab('exercises');
        setNewComment('');
      }
    };
  }, [visible, activity?.id]);

  const loadComments = async () => {
    if (!activity?.id) return;
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
      // Make sure we're on the exercises tab for the screenshot
      setActiveTab('exercises');

      // Wait a moment for the UI to update
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

  if (!activity) return null;

  const workoutTypeColor = themeColors.workoutTypes[activity.workoutType] || themeColors.workoutTypes.Other;
  const hasExercises = activity.exercises && activity.exercises.length > 0;

  const handleViewProfile = () => {
    onClose();
    if (activity.friend?.id) {
      onViewProfile(activity.friend.id, activity.friend.name);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalKeyboardView}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <Animated.View
            entering={FadeInUp.springify().damping(15)}
            style={styles.workoutDetailModal}
          >
            <View style={styles.modalHandle} />

            {/* Header - Outside ViewShot */}
            <View style={styles.workoutDetailHeader}>
              <Pressable onPress={handleViewProfile} style={styles.workoutDetailHeaderTappable}>
                <Avatar imageUrl={activity.friend?.profilePicture} size={44} />
                <View style={styles.workoutDetailHeaderInfo}>
                  <Text style={styles.workoutDetailFriend}>{activity.friend?.name || 'Unknown'}</Text>
                  <Text style={styles.workoutDetailTime}>{activity.timeAgo}</Text>
                </View>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
                <X size={24} color={themeColors.text.tertiary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Shareable Content */}
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.viewShotContainer}>
              <View style={styles.shareableContent}>
                {/* Workout Banner */}
                <View style={[styles.workoutDetailBanner, { backgroundColor: `${workoutTypeColor}15`, borderColor: `${workoutTypeColor}40` }]}>
                  <Text style={[styles.workoutDetailName, { color: workoutTypeColor }]}>{activity.workoutName}</Text>
                  <View style={styles.workoutDetailStats}>
                    <Text style={styles.workoutDetailStat}>{activity.workoutType}</Text>
                    <Text style={styles.workoutDetailStat}>•</Text>
                    <Text style={styles.workoutDetailStat}>{activity.duration} min</Text>
                    {hasExercises && (
                      <>
                        <Text style={styles.workoutDetailStat}>•</Text>
                        <Text style={styles.workoutDetailStat}>{activity.exercises.length} exercises</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Exercise List */}
                {hasExercises && activeTab === 'exercises' && (
                  <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
                    {activity.exercises.map((exercise, idx) => {
                      // Determine if this is a cardio exercise based on workout type or set structure
                      const isCardioWorkout = ['Running', 'Cycling', 'Swimming'].includes(activity.workoutType);
                      const firstSet = exercise.sets?.[0];
                      const hasCardioFields = firstSet && ('distance' in firstSet || 'time' in firstSet || 'pace' in firstSet);
                      const hasStrengthFields = firstSet && ('weight' in firstSet || 'reps' in firstSet);
                      const isCardioExercise = isCardioWorkout || (hasCardioFields && !hasStrengthFields);

                      const sets = exercise.sets || [];

                      return (
                        <View key={idx} style={styles.exerciseItem}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
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
                                  const weightDisplay = weight > 0 ? `${weight} lbs` : 'BW';
                                  setDisplay = `${weightDisplay} × ${reps}`;
                                }

                                return (
                                  <View key={setIdx} style={styles.setRow}>
                                    <Text style={styles.setNumber}>{setIdx + 1}</Text>
                                    <Text style={styles.setDetails}>{setDisplay}</Text>
                                  </View>
                                );
                              })
                            ) : (
                              <View style={styles.setRow}>
                                <Text style={styles.setDetails}>No sets recorded</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {/* No Exercises Message */}
                {!hasExercises && activeTab === 'exercises' && (
                  <View style={styles.noExercisesContainer}>
                    <Activity size={32} color={themeColors.text.tertiary} strokeWidth={1.5} />
                    <Text style={styles.noExercisesText}>
                      {['Running', 'Cycling', 'Swimming'].includes(activity.workoutType)
                        ? 'Cardio workout completed'
                        : 'No exercise details available'}
                    </Text>
                  </View>
                )}
              </View>
            </ViewShot>

            {/* Comments Tab Content */}
            {activeTab === 'comments' && (
              <View style={styles.commentsSection}>
                {isLoadingComments ? (
                  <View style={styles.commentsLoading}>
                    <ActivityIndicator size="small" color={themeColors.accent.primary} />
                    <Text style={styles.loadingText}>Loading comments...</Text>
                  </View>
                ) : comments.length > 0 ? (
                  <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                    {comments.map((comment, idx) => (
                      <View key={comment.id || idx} style={styles.commentItem}>
                        <View style={styles.commentAvatarSmall}>
                          {comment.user?.profilePicture ? (
                            <Image
                              source={{ uri: comment.user.profilePicture }}
                              style={styles.commentAvatarImage}
                            />
                          ) : (
                            <User size={16} color={themeColors.accent.primary} strokeWidth={1.5} />
                          )}
                        </View>
                        <View style={styles.commentContent}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentAuthor}>{comment.user?.name || 'Unknown'}</Text>
                            <Text style={styles.commentTime}>{comment.timeAgo || ''}</Text>
                          </View>
                          <Text style={styles.commentText}>{comment.text}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <MessageCircle size={40} color={themeColors.text.tertiary} strokeWidth={1.5} />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>Be the first to leave a comment!</Text>
                  </View>
                )}

                {/* Comment Input */}
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    placeholderTextColor={themeColors.text.tertiary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={handleSendComment}
                  />
                  <Pressable
                    onPress={handleSendComment}
                    style={[
                      styles.sendCommentButton,
                      (!newComment.trim() || isSendingComment) && styles.sendCommentButtonDisabled
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
              </View>
            )}

            {/* Tab Bar */}
            <View style={styles.detailTabContainer}>
              <Pressable
                style={[styles.detailTab, activeTab === 'exercises' && styles.detailTabActive]}
                onPress={() => setActiveTab('exercises')}
              >
                <Activity size={16} color={activeTab === 'exercises' ? themeColors.accent.primary : themeColors.text.tertiary} strokeWidth={2} />
                <Text style={[styles.detailTabText, activeTab === 'exercises' && styles.detailTabTextActive]}>
                  Exercises
                </Text>
              </Pressable>
              <Pressable
                style={[styles.detailTab, activeTab === 'comments' && styles.detailTabActive]}
                onPress={() => setActiveTab('comments')}
              >
                <MessageCircle size={16} color={activeTab === 'comments' ? themeColors.accent.primary : themeColors.text.tertiary} strokeWidth={2} />
                <Text style={[styles.detailTabText, activeTab === 'comments' && styles.detailTabTextActive]}>
                  Comments{comments.length > 0 ? ` (${comments.length})` : ''}
                </Text>
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={[styles.modalActions, { paddingBottom: bottomPadding }]}>
              <Pressable
                style={styles.shareButton}
                onPress={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color={themeColors.accent.primary} />
                ) : (
                  <Share2 size={18} color={themeColors.accent.primary} strokeWidth={2} />
                )}
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>

              {hasExercises && (
                <Pressable style={styles.saveTemplateButton} onPress={() => onSaveTemplate(activity)}>
                  <Save size={18} color={themeColors.secondary.primary} strokeWidth={2} />
                  <Text style={styles.saveTemplateText}>Save Template</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Helper to get workout summary based on type
const getWorkoutSummary = (activity) => {
  const isCardio = ['Running', 'Cycling', 'Swimming'].includes(activity.workoutType);
  const exercises = activity.exercises || [];
  const exerciseCount = exercises.length;

  if (isCardio) {
    // For cardio, aggregate distance and time from all exercises/sets
    let totalDistance = 0;
    let totalTime = 0;

    exercises.forEach(ex => {
      (ex.sets || []).forEach(set => {
        totalDistance += parseFloat(set.distance) || 0;
        totalTime += parseFloat(set.time) || 0;
      });
    });

    // Also check top-level duration
    if (totalTime === 0 && activity.duration) {
      totalTime = activity.duration;
    }

    // Calculate pace (min/mile) if we have both distance and time
    let paceStr = '';
    if (totalDistance > 0 && totalTime > 0) {
      const paceMinPerMile = totalTime / totalDistance;
      const paceMin = Math.floor(paceMinPerMile);
      const paceSec = Math.round((paceMinPerMile - paceMin) * 60);
      paceStr = `${paceMin}:${paceSec.toString().padStart(2, '0')} /mi`;
    }

    const parts = [];
    if (totalDistance > 0) parts.push(`${totalDistance.toFixed(1)} mi`);
    if (totalTime > 0) parts.push(`${Math.round(totalTime)} min`);
    if (paceStr) parts.push(paceStr);

    return parts.length > 0 ? parts.join(' • ') : 'Cardio workout';
  } else {
    // For strength, show exercise count
    if (exerciseCount > 0) {
      return `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`;
    }
    return 'Strength workout';
  }
};

// Activity Feed Item
const ActivityItem = ({ activity, index }) => {
  const { colors: themeColors } = useTheme();
  const [isLiked, setIsLiked] = useState(activity.isLiked || false);
  const [likeCount, setLikeCount] = useState(activity.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const heartScale = useSharedValue(1);
  const workoutTypeColor = themeColors.workoutTypes[activity.workoutType] || themeColors.workoutTypes.Other;
  const WorkoutIcon = getWorkoutIcon(activity.workoutType);
  const workoutSummary = getWorkoutSummary(activity);

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);

    // Animate heart
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4 }),
      withSpring(1, { damping: 8 })
    );

    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const result = await likeWorkout(activity.id);
      if (!result.success) {
        // Revert on failure
        setIsLiked(!newLiked);
        setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
    }

    setIsLiking(false);
  };

  const handleNavigate = (options = {}) => {
    router.push({
      pathname: '/friend-workout-detail',
      params: {
        activity: JSON.stringify(activity),
        focusComment: options.focusComment ? 'true' : undefined,
      }
    });
  };

  const handleShare = async () => {
    try {
      // Create shareable text content
      const workoutInfo = `${activity.friend?.name || 'Someone'} completed ${activity.workoutName} (${activity.workoutType})! 💪\n\n${workoutSummary}\n\nShared via TrainTrack`;

      await Share.share({
        message: workoutInfo,
        title: `${activity.friend?.name}'s Workout`,
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share workout');
      }
    }
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={[styles.activityCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
    >
      {/* Tappable Card Content */}
      <Pressable onPress={handleNavigate} style={styles.activityCardPressable}>
        {/* Compact Header: Avatar + Name + Workout Icon + Timestamp */}
        <View style={styles.activityHeader}>
          <Avatar imageUrl={activity.friend?.profilePicture} size={40} />
          <View style={styles.activityHeaderText}>
            <View style={styles.activityNameRow}>
              <Text style={[styles.activityFriend, { color: themeColors.text.primary }]}>{activity.friend?.name || 'Unknown'}</Text>
              <Text style={[styles.activityCompletedText, { color: themeColors.text.tertiary }]}>completed a workout</Text>
            </View>
            <Text style={[styles.activityTime, { color: themeColors.text.tertiary }]}>{activity.timeAgo}</Text>
          </View>
        </View>

        {/* Workout Info Banner */}
        <View style={[styles.activityWorkoutBanner, { backgroundColor: workoutTypeColor + '12', borderColor: workoutTypeColor + '30' }]}>
          <View style={[styles.workoutTypeIconLarge, { backgroundColor: workoutTypeColor + '20' }]}>
            <WorkoutIcon size={20} color={workoutTypeColor} strokeWidth={2} />
          </View>
          <View style={styles.activityWorkoutInfo}>
            <Text style={[styles.activityWorkoutName, { color: themeColors.text.primary }]}>{activity.workoutName}</Text>
            <Text style={[styles.activityWorkoutSummary, { color: themeColors.text.secondary }]}>{workoutSummary}</Text>
          </View>
          <ChevronRight size={20} color={themeColors.text.tertiary} strokeWidth={2} />
        </View>
      </Pressable>

      {/* Actions Bar */}
      <View style={[styles.activityActions, { borderTopColor: themeColors.surface.border }]}>
        <Pressable
          onPress={handleLike}
          style={[styles.actionButton, isLiked && { backgroundColor: SOCIAL_COLORS.heartDim }]}
          disabled={isLiking}
        >
          <Animated.View style={heartAnimatedStyle}>
            <Heart
              size={18}
              color={isLiked ? SOCIAL_COLORS.heart : themeColors.text.tertiary}
              fill={isLiked ? SOCIAL_COLORS.heart : 'transparent'}
              strokeWidth={2}
            />
          </Animated.View>
          {likeCount > 0 && (
            <Text style={[styles.actionCount, { color: themeColors.text.tertiary }, isLiked && { color: SOCIAL_COLORS.heart }]}>
              {likeCount}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => handleNavigate({ focusComment: true })} style={styles.actionButton}>
          <MessageCircle size={18} color={themeColors.text.tertiary} strokeWidth={2} />
          {(activity.commentCount || 0) > 0 && (
            <Text style={[styles.actionCount, { color: themeColors.text.tertiary }]}>{activity.commentCount}</Text>
          )}
        </Pressable>

        <Pressable onPress={handleShare} style={styles.actionButton}>
          <Share2 size={18} color={themeColors.text.tertiary} strokeWidth={2} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

// Friend Card
const FriendCard = ({ friend, index, onRemove, onViewProfile }) => {
  const { colors: themeColors } = useTheme();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName || friend.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            await onRemove(friend.friendshipId);
            setIsRemoving(false);
          }
        }
      ]
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50)} style={[styles.friendCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
      <Pressable
        style={styles.friendCardContent}
        onPress={() => onViewProfile(friend.id, friend.displayName || friend.username)}
      >
        <Avatar imageUrl={friend.profilePicture} size={44} />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: themeColors.text.primary }]}>{friend.displayName || friend.username}</Text>
          <Text style={[styles.friendUsername, { color: themeColors.text.tertiary }]}>@{friend.username}</Text>
        </View>
        <ChevronRight size={20} color={themeColors.text.tertiary} strokeWidth={2} />
      </Pressable>
      <Pressable
        onPress={handleRemove}
        style={[styles.removeFriendButton, { borderLeftColor: themeColors.surface.border }]}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <Loader size={16} color={themeColors.error} strokeWidth={2} />
        ) : (
          <UserMinus size={16} color={themeColors.error} strokeWidth={2} />
        )}
      </Pressable>
    </Animated.View>
  );
};

// Friend Request Card
const RequestCard = ({ request, onAccept, onDecline }) => {
  const { colors: themeColors } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept(request.id);
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    await onDecline(request.id);
    setIsProcessing(false);
  };

  return (
    <Animated.View entering={FadeIn} style={[styles.requestCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
      <Avatar imageUrl={request.profilePicture} size={40} />
      <View style={styles.requestInfo}>
        <Text style={[styles.requestName, { color: themeColors.text.primary }]}>{request.displayName || request.username}</Text>
        <Text style={[styles.requestUsername, { color: themeColors.text.tertiary }]}>@{request.username}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          onPress={handleDecline}
          style={[styles.declineButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
          disabled={isProcessing}
        >
          <X size={18} color={themeColors.text.tertiary} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={handleAccept}
          style={[styles.acceptButton, { backgroundColor: themeColors.accent.primary }]}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader size={18} color={themeColors.text.inverse} strokeWidth={2} />
          ) : (
            <Check size={18} color={themeColors.text.inverse} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
};

// Search Result Card
const SearchResultCard = ({ user, onSendRequest, isPending }) => {
  const { colors: themeColors } = useTheme();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(isPending);

  const handleSend = async () => {
    setIsSending(true);
    const result = await onSendRequest(user.id);
    if (result) {
      setSent(true);
    }
    setIsSending(false);
  };

  return (
    <Animated.View entering={FadeIn} style={[styles.searchResultCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
      <Avatar imageUrl={user.profilePicture} size={40} />
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { color: themeColors.text.primary }]}>{user.displayName || user.username}</Text>
        <Text style={[styles.searchResultUsername, { color: themeColors.text.tertiary }]}>@{user.username}</Text>
      </View>
      {sent ? (
        <View style={[styles.pendingBadge, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Text style={[styles.pendingText, { color: themeColors.text.tertiary }]}>Pending</Text>
        </View>
      ) : (
        <Pressable onPress={handleSend} style={[styles.addButton, { backgroundColor: themeColors.accent.primaryDim }]} disabled={isSending}>
          {isSending ? (
            <Loader size={18} color={themeColors.accent.primary} strokeWidth={2} />
          ) : (
            <UserPlus size={18} color={themeColors.accent.primary} strokeWidth={2} />
          )}
        </Pressable>
      )}
    </Animated.View>
  );
};

// Main Social Screen
export default function SocialScreen() {
  const { colors: themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState('activity');
  const [friends, setFriends] = useState([]);
  const [activities, setActivities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [friendsData, activityData, requestsData] = await Promise.all([
        getFriends(),
        getActivityFeed(),
        getPendingRequests(),
      ]);
      setFriends(friendsData || []);
      setActivities(activityData || []);
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results || []);
    setIsSearching(false);
  };

  const handleSendRequest = async (userId) => {
    const result = await sendFriendRequest(userId);
    return result.success;
  };

  const handleAcceptRequest = async (requestId) => {
    await acceptFriendRequest(requestId);
    loadData();
  };

  const handleDeclineRequest = async (requestId) => {
    await declineFriendRequest(requestId);
    loadData();
  };

  const handleRemoveFriend = async (friendshipId) => {
    await removeFriend(friendshipId);
    loadData();
  };

  const handleViewProfile = (userId, friendName) => {
    router.push({
      pathname: '/friend-profile',
      params: { userId, friendName }
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background.primary }]}>
        <ActivityIndicator size="large" color={themeColors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      {/* Toggle Tab Bar */}
      <View style={[styles.toggleContainer, { backgroundColor: themeColors.background.primary }]}>
        <View style={[styles.toggleWrapper, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
          <Pressable
            style={[
              styles.toggleButton,
              activeTab === 'activity' && { backgroundColor: themeColors.accent.primary }
            ]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[
              styles.toggleText,
              { color: themeColors.text.tertiary },
              activeTab === 'activity' && { color: themeColors.text.inverse }
            ]}>Activity</Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              activeTab === 'friends' && { backgroundColor: themeColors.accent.primary }
            ]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[
              styles.toggleText,
              { color: themeColors.text.tertiary },
              activeTab === 'friends' && { color: themeColors.text.inverse }
            ]}>Friends</Text>
            {requests.length > 0 && (
              <View style={[styles.requestBadge, { backgroundColor: themeColors.error }]}>
                <Text style={[styles.requestBadgeText, { color: themeColors.text.inverse }]}>{requests.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Activity Feed */}
      {activeTab === 'activity' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.accent.primary}
            />
          }
        >
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                index={index}
              />
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.accent.primaryDim }]}>
                <Sparkles size={32} color={themeColors.accent.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>No Activity Yet</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.text.secondary }]}>
                Add friends to see their workouts here
              </Text>
              <Pressable
                style={[styles.emptyActionButton, { backgroundColor: themeColors.accent.primary }]}
                onPress={() => setActiveTab('friends')}
              >
                <UserPlus size={16} color={themeColors.text.inverse} strokeWidth={2} />
                <Text style={[styles.emptyActionText, { color: themeColors.text.inverse }]}>Find Friends</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.accent.primary}
            />
          }
        >
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
            <Search size={18} color={themeColors.text.tertiary} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text.primary }]}
              placeholder="Search for friends..."
              placeholderTextColor={themeColors.text.tertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setShowSearch(true)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <X size={18} color={themeColors.text.tertiary} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {/* Search Results */}
          {showSearch && searchQuery.length >= 2 && (
            <View style={styles.searchResults}>
              {isSearching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={themeColors.accent.primary} />
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => (
                  <SearchResultCard
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                    isPending={user.isPending}
                  />
                ))
              ) : (
                <Text style={[styles.noResultsText, { color: themeColors.text.tertiary }]}>No users found</Text>
              )}
            </View>
          )}

          {/* Pending Requests */}
          {requests.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>FRIEND REQUESTS</Text>
              {requests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              ))}
            </View>
          )}

          {/* Friends List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>YOUR FRIENDS ({friends.length})</Text>
            {friends.length > 0 ? (
              friends.map((friend, index) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  index={index}
                  onRemove={handleRemoveFriend}
                  onViewProfile={handleViewProfile}
                />
              ))
            ) : (
              <View style={[styles.emptyFriends, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: SOCIAL_COLORS.connectionDim }]}>
                  <Users size={28} color={SOCIAL_COLORS.connection} strokeWidth={1.5} />
                </View>
                <Text style={[styles.emptyFriendsText, { color: themeColors.text.primary }]}>No friends yet</Text>
                <Text style={[styles.emptyFriendsSubtext, { color: themeColors.text.secondary }]}>Use the search bar above to find and add friends</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: 100,
  },

  // Toggle Tab Bar
  toggleContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.primary,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.accent.primary,
  },
  toggleText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  toggleTextActive: {
    color: COLORS.text.inverse,
  },
  requestBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: '700',
    fontSize: 10,
  },

  // Avatar
  avatarContainer: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarInner: {
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface.border,
  },

  // Activity Card
  activityCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  activityCardPressable: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activityHeaderText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  activityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  activityFriend: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  workoutTypeIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  activityCompletedText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  activityWorkoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  workoutTypeIconLarge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityWorkoutInfo: {
    flex: 1,
  },
  activityWorkoutName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 15,
    marginBottom: 4,
  },
  activityWorkoutSummary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontSize: 12,
  },
  activityWorkoutDuration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontSize: 11,
  },
  activityActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginHorizontal: 2,
  },
  actionCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '600',
    fontSize: 12,
  },

  // Modal
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  workoutDetailModal: {
    backgroundColor: COLORS.background.elevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.surface.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  workoutDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  workoutDetailHeaderTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutDetailHeaderInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  workoutDetailFriend: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  workoutDetailTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  viewShotContainer: {
    backgroundColor: COLORS.background.secondary,
  },
  shareableContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  workoutDetailBanner: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    maxHeight: 250,
  },
  exerciseItem: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
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
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  noExercisesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Detail Tabs
  detailTabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  detailTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  detailTabActive: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  detailTabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
  detailTabTextActive: {
    color: COLORS.accent.primary,
  },

  // Comments
  commentsSection: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    minHeight: 200,
  },
  commentsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  commentsList: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  commentAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  commentHeader: {
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
  noCommentsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  noCommentsText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  noCommentsSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  commentInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    maxHeight: 80,
    minHeight: 40,
    paddingVertical: SPACING.xs,
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

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent.primary + '40',
  },
  shareButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
  saveTemplateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary.dim,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary.primary + '40',
  },
  saveTemplateText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.secondary.primary,
  },

  // Friends Tab
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.sm,
    fontSize: 14,
  },
  searchResults: {
    marginBottom: SPACING.md,
  },
  searchLoading: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  noResultsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    fontSize: 14,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  searchResultName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  searchResultUsername: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  pendingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontSize: 10,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  requestInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  requestName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  requestUsername: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  friendCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  friendInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  friendName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  friendUsername: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
  removeFriendButton: {
    padding: SPACING.sm,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.surface.border,
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  emptyFriendsText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
  },
  emptyFriendsSubtext: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 220,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.lg,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    fontSize: 14,
    maxWidth: 250,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  emptyActionText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
  },
});
