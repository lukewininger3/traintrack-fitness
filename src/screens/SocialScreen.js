import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  Activity,
  Check,
  ChevronRight,
  Flame,
  Heart,
  Loader,
  Save,
  Search,
  Share2,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/design';
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
} from '../utils/socialStorage';
import { saveTemplate } from '../utils/workoutTemplates';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Social-specific colors
const SOCIAL_COLORS = {
  connection: '#FFB547',
  connectionDim: 'rgba(255, 181, 71, 0.15)',
  heart: '#FF6B8A',
  heartDim: 'rgba(255, 107, 138, 0.15)',
};

// Simple Avatar component
const Avatar = ({ initials, size = 48, delay = 0 }) => {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={[styles.avatarContainer, { width: size, height: size }]}
    >
      <View style={[styles.avatarInner, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    </Animated.View>
  );
};

// Workout Detail Modal
const WorkoutDetailModal = ({ activity, visible, onClose, onSaveTemplate, onViewProfile }) => {
  if (!activity) return null;

  const workoutTypeColor = COLORS.workoutTypes[activity.workoutType] || COLORS.workoutTypes.Other;
  const hasExercises = activity.exercises && activity.exercises.length > 0;

  const handleViewProfile = () => {
    onClose();
    if (activity.friend?.id) {
      onViewProfile(activity.friend.id, activity.friend.name);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              entering={FadeInUp.springify().damping(15)}
              style={styles.workoutDetailModal}
            >
              <View style={styles.modalHandle} />

              <View style={styles.workoutDetailHeader}>
                <Pressable onPress={handleViewProfile} style={styles.workoutDetailHeaderTappable}>
                  <Avatar initials={activity.friend?.avatar || 'U'} size={44} />
                  <View style={styles.workoutDetailHeaderInfo}>
                    <Text style={styles.workoutDetailFriend}>{activity.friend?.name || 'Unknown'}</Text>
                    <Text style={styles.workoutDetailTime}>{activity.timeAgo}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={onClose} hitSlop={12}>
                  <X size={24} color={COLORS.text.tertiary} strokeWidth={2} />
                </Pressable>
              </View>

              <View style={[styles.workoutDetailBanner, { backgroundColor: `${workoutTypeColor}10`, borderColor: `${workoutTypeColor}30` }]}>
                <Text style={[styles.workoutDetailName, { color: workoutTypeColor }]}>{activity.workoutName}</Text>
                <View style={styles.workoutDetailStats}>
                  <Text style={styles.workoutDetailStat}>{activity.duration} min</Text>
                  {hasExercises && <Text style={styles.workoutDetailStat}>•</Text>}
                  {hasExercises && <Text style={styles.workoutDetailStat}>{activity.exercises.length} exercises</Text>}
                  {activity.distance && <Text style={styles.workoutDetailStat}>•</Text>}
                  {activity.distance && <Text style={styles.workoutDetailStat}>{activity.distance}</Text>}
                </View>
              </View>

              {hasExercises ? (
                <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
                  {activity.exercises.map((exercise, idx) => {
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
                  <Text style={styles.noExercisesText}>
                    {activity.workoutType === 'Running' || activity.workoutType === 'Cycling'
                      ? 'Cardio workout - no exercise details'
                      : 'No exercise details available'}
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                {hasExercises && (
                  <Pressable style={styles.saveTemplateButton} onPress={() => onSaveTemplate(activity)}>
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

// Activity Feed Item
const ActivityItem = ({ activity, index, onLike, onShare, onPress }) => {
  const [isLiked, setIsLiked] = useState(activity.isLiked);
  const [likeCount, setLikeCount] = useState(activity.likes);
  const [isLiking, setIsLiking] = useState(false);
  const heartScale = useSharedValue(1);
  const workoutTypeColor = COLORS.workoutTypes[activity.workoutType] || COLORS.workoutTypes.Other;
  const exerciseCount = activity.exercises?.length || 0;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (isLiking) return;

    setIsLiking(true);
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 4 }),
      withSpring(1, { damping: 8 })
    );

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    const result = await onLike?.(activity.id);
    if (!result?.success) {
      // Revert on failure
      setIsLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
    setIsLiking(false);
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <Pressable onPress={() => onPress?.(activity)}>
      <Animated.View
        entering={FadeInDown.delay(200 + index * 80).springify().damping(15)}
        layout={Layout.springify().damping(15)}
        style={styles.activityItem}
      >
        <View style={styles.activityHeader}>
          <Avatar initials={activity.friend?.avatar || 'U'} size={40} />
          <View style={styles.activityInfo}>
            <Text style={styles.activityFriendName}>{activity.friend?.name || 'Unknown'}</Text>
            <Text style={styles.activityTime}>{activity.timeAgo}</Text>
          </View>
          <View style={[styles.workoutTypeBadge, { backgroundColor: `${workoutTypeColor}15`, borderColor: `${workoutTypeColor}30` }]}>
            <Activity size={12} color={workoutTypeColor} strokeWidth={2.5} />
            <Text style={[styles.workoutTypeText, { color: workoutTypeColor }]}>
              {activity.workoutType}
            </Text>
          </View>
        </View>

        <View style={styles.workoutSummary}>
          <Text style={styles.workoutName}>{activity.workoutName}</Text>
          <View style={styles.workoutMeta}>
            <Text style={styles.workoutMetaText}>{activity.duration} min</Text>
            {exerciseCount > 0 && (
              <>
                <Text style={styles.workoutMetaDot}>•</Text>
                <Text style={styles.workoutMetaText}>{exerciseCount} exercises</Text>
              </>
            )}
            {activity.distance && (
              <>
                <Text style={styles.workoutMetaDot}>•</Text>
                <Text style={styles.workoutMetaText}>{activity.distance}</Text>
              </>
            )}
          </View>
          {exerciseCount > 0 && (
            <Text style={styles.tapToView}>Tap to view details</Text>
          )}
        </View>

        <View style={styles.activityActions}>
          <AnimatedPressable onPress={handleLike} style={styles.actionButton} disabled={isLiking}>
            <Animated.View style={heartAnimatedStyle}>
              <Heart
                size={20}
                color={isLiked ? SOCIAL_COLORS.heart : COLORS.text.tertiary}
                fill={isLiked ? SOCIAL_COLORS.heart : 'transparent'}
                strokeWidth={2}
              />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && { color: SOCIAL_COLORS.heart }]}>
              {likeCount}
            </Text>
          </AnimatedPressable>

          <Pressable onPress={(e) => { e.stopPropagation(); onShare?.(activity); }} style={styles.actionButton}>
            <Share2 size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Friend Request Item
const FriendRequestItem = ({ request, onAccept, onDecline }) => {
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
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      style={styles.requestItem}
    >
      <Avatar initials={request.from_profile?.avatar_initials || 'U'} size={44} />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.from_profile?.display_name || request.from_profile?.username}</Text>
        <Text style={styles.requestUsername}>@{request.from_profile?.username}</Text>
      </View>
      {isProcessing ? (
        <ActivityIndicator size="small" color={COLORS.accent.primary} />
      ) : (
        <View style={styles.requestActions}>
          <Pressable onPress={handleAccept} style={styles.acceptButton}>
            <Check size={18} color={COLORS.text.inverse} strokeWidth={2.5} />
          </Pressable>
          <Pressable onPress={handleDecline} style={styles.declineButton}>
            <X size={18} color={COLORS.error} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
};

// Search Result Item
const SearchResultItem = ({ user, onSendRequest, isPending }) => {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(isPending);

  const handleSend = async () => {
    setIsSending(true);
    const result = await onSendRequest(user.id);
    if (result.success) {
      setSent(true);
    } else {
      Alert.alert('Error', result.error || 'Failed to send request');
    }
    setIsSending(false);
  };

  return (
    <View style={styles.searchResultItem}>
      <Avatar initials={user.avatar_initials || 'U'} size={40} />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{user.display_name || user.username}</Text>
        <Text style={styles.searchResultUsername}>@{user.username}</Text>
      </View>
      {isSending ? (
        <ActivityIndicator size="small" color={COLORS.accent.primary} />
      ) : sent ? (
        <View style={styles.sentBadge}>
          <Text style={styles.sentBadgeText}>Sent</Text>
        </View>
      ) : (
        <Pressable onPress={handleSend} style={styles.addButton}>
          <UserPlus size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
};

// Empty State Component
const EmptyState = ({ onAddFriend }) => (
  <Animated.View
    entering={FadeIn.delay(200).duration(400)}
    style={styles.emptyState}
  >
    <View style={styles.emptyIconContainer}>
      <Users size={48} color={SOCIAL_COLORS.connection} strokeWidth={1.5} />
      <Animated.View entering={FadeIn.delay(500)} style={styles.emptySparkle}>
        <Sparkles size={20} color={COLORS.accent.primary} strokeWidth={2} />
      </Animated.View>
    </View>
    <Text style={styles.emptyTitle}>Your Crew Awaits</Text>
    <Text style={styles.emptySubtitle}>
      Connect with friends to see their workouts,{'\n'}
      compete on leaderboards, and stay motivated together.
    </Text>
    <Pressable style={styles.emptyButton} onPress={onAddFriend}>
      <UserPlus size={18} color={COLORS.text.inverse} strokeWidth={2.5} />
      <Text style={styles.emptyButtonText}>Find Friends</Text>
    </Pressable>
  </Animated.View>
);

// Add Friend Modal - Full Screen
const AddFriendModal = ({ visible, onClose, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = React.useRef(null);

  // Debounced search - triggers as user types
  const handleSearchChange = (query) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Show searching indicator immediately
    setIsSearching(true);

    // Debounce the actual search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSendRequest = async (userId) => {
    const result = await sendFriendRequest(userId);
    return result;
  };

  const handleInvite = () => {
    Alert.alert(
      'Coming Soon',
      'Invite links will be available in a future update. For now, share your username with friends!',
      [{ text: 'OK' }]
    );
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={styles.addFriendFullScreen}>
        <View style={styles.addFriendHeader}>
          <Pressable onPress={handleClose} style={styles.addFriendCloseButton}>
            <X size={24} color={COLORS.text.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.addFriendTitle}>ADD FRIENDS</Text>
          <View style={styles.addFriendCloseButton} />
        </View>

        <View style={styles.searchContainerFull}>
          <Search size={20} color={COLORS.text.tertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInputFull}
            placeholder="Search by username..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {isSearching && (
            <ActivityIndicator size="small" color={COLORS.accent.primary} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <Pressable onPress={() => handleSearchChange('')}>
              <X size={18} color={COLORS.text.tertiary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.searchResultsFullList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <SearchResultItem
                key={user.id}
                user={user}
                onSendRequest={handleSendRequest}
                isPending={false}
              />
            ))
          ) : searchQuery.length >= 2 && !isSearching ? (
            <View style={styles.noResultsContainerFull}>
              <Users size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.noResultsTextFull}>No users found</Text>
              <Text style={styles.noResultsSubtext}>Try a different username</Text>
            </View>
          ) : searchQuery.length === 0 ? (
            <View style={styles.searchPromptContainer}>
              <Search size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.searchPromptText}>Search for friends</Text>
              <Text style={styles.searchPromptSubtext}>Enter a username to find people</Text>

              <View style={styles.inviteSectionFull}>
                <View style={styles.modalDividerFull}>
                  <View style={styles.modalDividerLine} />
                  <Text style={styles.modalDividerText}>OR</Text>
                  <View style={styles.modalDividerLine} />
                </View>

                <Pressable style={styles.inviteButtonFull} onPress={handleInvite}>
                  <Share2 size={22} color={COLORS.accent.primary} strokeWidth={2} />
                  <View style={styles.inviteTextContainer}>
                    <Text style={styles.inviteTitle}>Invite Friends</Text>
                    <Text style={styles.inviteSubtitle}>Share your invite link</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function SocialScreen() {
  const [friends, setFriends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      const [friendsData, activityData, requestsData, profileData] = await Promise.all([
        getFriends(),
        getActivityFeed(),
        getPendingRequests(),
        getProfile(),
      ]);

      setFriends(friendsData);
      setActivity(activityData);
      setPendingRequests(requestsData);
      setProfile(profileData);
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
    loadData(false);
  };

  const handleLike = async (activityId) => {
    return await likeWorkout(activityId);
  };

  const handleShare = async (activityItem) => {
    try {
      await Share.share({
        message: `Check out ${activityItem.friend?.name}'s ${activityItem.workoutName} on TrainTrack!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      await loadData(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    const result = await declineFriendRequest(requestId);
    if (result.success) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } else {
      Alert.alert('Error', result.error || 'Failed to decline request');
    }
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(friend.id);
            if (result.success) {
              setFriends(prev => prev.filter(f => f.id !== friend.id));
            } else {
              Alert.alert('Error', result.error || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (userId, friendName) => {
    router.push({
      pathname: '/friend-profile',
      params: { userId, friendName },
    });
  };

  const handleSaveAsTemplate = async (activity) => {
    try {
      const template = {
        name: activity.workoutName,
        type: activity.workoutType,
        exercises: activity.exercises.map(ex => ({
          name: ex.name,
          sets: (ex.sets || []).map(s => ({
            reps: s.reps,
            weight: s.weight || 0,
          })),
        })),
      };

      const result = await saveTemplate(template);
      if (result.success) {
        Alert.alert('Saved!', `"${activity.workoutName}" has been saved as a template.`);
        setSelectedActivity(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to save template');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const hasFriends = friends.length > 0;
  const hasRequests = pendingRequests.length > 0;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent.primary}
          />
        }
      >
        {/* Pending Friend Requests */}
        {hasRequests && (
          <Animated.View
            entering={FadeInDown.delay(100).springify().damping(15)}
            style={styles.requestsCard}
          >
            <View style={styles.requestsHeader}>
              <UserCheck size={18} color={SOCIAL_COLORS.connection} strokeWidth={2} />
              <Text style={styles.requestsTitle}>FRIEND REQUESTS</Text>
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>{pendingRequests.length}</Text>
              </View>
            </View>
            {pendingRequests.map((request) => (
              <FriendRequestItem
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            ))}
          </Animated.View>
        )}

        {hasFriends ? (
          <>
            {/* Tab Switcher */}
            <Animated.View
              entering={FadeIn.delay(200)}
              style={styles.tabContainer}
            >
              <Pressable
                style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
                onPress={() => setActiveTab('feed')}
              >
                <Activity size={16} color={activeTab === 'feed' ? COLORS.accent.primary : COLORS.text.tertiary} strokeWidth={2} />
                <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Activity</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
                onPress={() => setActiveTab('friends')}
              >
                <Users size={16} color={activeTab === 'friends' ? COLORS.accent.primary : COLORS.text.tertiary} strokeWidth={2} />
                <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</Text>
                <View style={styles.friendCountBadge}>
                  <Text style={styles.friendCountText}>{friends.length}</Text>
                </View>
              </Pressable>
            </Animated.View>

            {activeTab === 'feed' ? (
              <View style={styles.feedContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                </View>
                {activity.length > 0 ? (
                  activity.map((item, index) => (
                    <ActivityItem
                      key={item.id}
                      activity={item}
                      index={index}
                      onLike={handleLike}
                      onShare={handleShare}
                      onPress={setSelectedActivity}
                    />
                  ))
                ) : (
                  <View style={styles.noActivityContainer}>
                    <Activity size={32} color={COLORS.text.tertiary} strokeWidth={1.5} />
                    <Text style={styles.noActivityText}>No recent activity from friends</Text>
                    <Text style={styles.noActivitySubtext}>When your friends share workouts, they'll appear here</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.friendsContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>YOUR CREW</Text>
                  <Pressable
                    style={styles.addFriendButton}
                    onPress={() => setShowAddFriend(true)}
                  >
                    <UserPlus size={16} color={COLORS.accent.primary} strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View style={styles.friendsList}>
                  {friends.map((friend, index) => (
                    <Pressable
                      key={friend.id}
                      onPress={() => handleViewProfile(friend.id, friend.name)}
                      onLongPress={() => handleRemoveFriend(friend)}
                    >
                      <Animated.View
                        entering={FadeInDown.delay(100 + index * 50).springify().damping(15)}
                        style={styles.friendRow}
                      >
                        <Avatar
                          initials={friend.avatar}
                          size={48}
                          delay={index * 50}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <View style={styles.friendStats}>
                            <View style={styles.friendStatItem}>
                              <Zap size={12} color={COLORS.accent.primary} strokeWidth={2.5} />
                              <Text style={styles.friendStatText}>{friend.workoutsThisWeek} this week</Text>
                            </View>
                            <View style={styles.friendStatItem}>
                              <Flame size={12} color={COLORS.secondary.primary} strokeWidth={2.5} />
                              <Text style={styles.friendStatText}>{friend.weekStreak} week streak</Text>
                            </View>
                          </View>
                        </View>
                        <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                      </Animated.View>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.friendsHint}>Tap for profile • Long press to remove</Text>
              </View>
            )}
          </>
        ) : (
          <EmptyState onAddFriend={() => setShowAddFriend(true)} />
        )}
      </ScrollView>

      {/* Floating Add Friend Button */}
      {hasFriends && activeTab === 'feed' && (
        <Animated.View
          entering={FadeIn.delay(500)}
          style={styles.fabContainer}
        >
          <Pressable
            style={styles.fab}
            onPress={() => setShowAddFriend(true)}
          >
            <UserPlus size={22} color={COLORS.text.inverse} strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      )}

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onRefresh={() => loadData(false)}
      />

      <WorkoutDetailModal
        activity={selectedActivity}
        visible={selectedActivity !== null}
        onClose={() => setSelectedActivity(null)}
        onSaveTemplate={handleSaveAsTemplate}
        onViewProfile={handleViewProfile}
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
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl + 80,
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface.border,
  },
  avatarText: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },

  // Friend Requests Card
  requestsCard: {
    backgroundColor: SOCIAL_COLORS.connectionDim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${SOCIAL_COLORS.connection}30`,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  requestsTitle: {
    ...TYPOGRAPHY.label,
    color: SOCIAL_COLORS.connection,
    flex: 1,
  },
  requestsBadge: {
    backgroundColor: SOCIAL_COLORS.connection,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  requestsBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  requestInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  requestName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  requestUsername: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.accent.primary,
  },
  friendCountBadge: {
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 2,
  },
  friendCountText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '700',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    letterSpacing: 1.5,
  },

  // Activity Feed
  feedContainer: {
    flex: 1,
  },
  activityItem: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activityInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  activityFriendName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  activityTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  workoutTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  workoutTypeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  workoutSummary: {
    marginBottom: SPACING.md,
  },
  workoutName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  workoutMetaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  workoutMetaDot: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  tapToView: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
  noActivityContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  noActivityText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },
  noActivitySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Friends List
  friendsContainer: {
    flex: 1,
  },
  addFriendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsList: {
    gap: SPACING.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  friendInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  friendName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  friendStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  friendStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendStatText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  friendsHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: SOCIAL_COLORS.connectionDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  emptySparkle: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },

  // Modal
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  addFriendModal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.surface.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    letterSpacing: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  searchResultsList: {
    maxHeight: 200,
    marginTop: SPACING.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  searchResultName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  searchResultUsername: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBadge: {
    backgroundColor: COLORS.surface.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  sentBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  noResultsContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  noResultsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surface.border,
  },
  modalDividerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  inviteSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // Full Screen Add Friend Modal
  addFriendFullScreen: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  addFriendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 44, // Account for status bar
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  addFriendCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },
  searchContainerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  searchInputFull: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
    height: '100%',
  },
  searchResultsFullList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  noResultsContainerFull: {
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
  },
  noResultsTextFull: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
  },
  noResultsSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  searchPromptContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
  },
  searchPromptText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
  },
  searchPromptSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  inviteSectionFull: {
    width: '100%',
    marginTop: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  modalDividerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  inviteButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
  },

  modalCloseButton: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
  },
  modalCloseText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.secondary,
  },

  // Workout Detail Modal
  workoutDetailModal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    maxHeight: '85%',
  },
  workoutDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  workoutDetailHeaderInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  workoutDetailFriend: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  workoutDetailTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
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
  workoutDetailHeaderTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    paddingHorizontal: SPACING.lg,
  },
  saveTemplateText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
});
