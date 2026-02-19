import { supabase } from '../config/supabase';

// Get current user helper
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get or create user profile
 */
export const getProfile = async (userId = null) => {
  try {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create one
      return await createProfile();
    }

    // Handle case where table doesn't exist
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      console.warn('Social tables not set up yet. Run the SQL setup in Supabase.');
      return null;
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
};

/**
 * Create user profile
 */
export const createProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Generate a default username from email
    const emailPrefix = user.email?.split('@')[0] || 'user';
    const randomSuffix = Math.floor(Math.random() * 9999);
    const defaultUsername = `${emailPrefix}${randomSuffix}`;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: defaultUsername,
        display_name: emailPrefix,
        avatar_initials: emailPrefix.substring(0, 2).toUpperCase(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (updates) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if username is available
 */
export const checkUsernameAvailable = async (username) => {
  try {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .neq('id', user?.id || '')
      .single();

    if (error && error.code === 'PGRST116') {
      // No matching profile found - username is available
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Search for users by username
 */
export const searchUsers = async (query) => {
  try {
    const user = await getCurrentUser();
    if (!user || !query || query.length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) throw error;
    // Map to include profilePicture
    return (data || []).map(user => ({
      ...user,
      profilePicture: user.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// ============================================
// FRIEND MANAGEMENT
// ============================================

/**
 * Send friend request
 */
export const sendFriendRequest = async (toUserId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Check if request already exists
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'Request already sent' };
      }
      if (existing.status === 'accepted') {
        return { success: false, error: 'Already friends' };
      }
    }

    // Check if already friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${user.id})`)
      .single();

    if (friendship) {
      return { success: false, error: 'Already friends' };
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        status: 'pending',
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get pending friend requests (received)
 */
export const getPendingRequests = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get requests first
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, from_user_id, created_at')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Handle missing table
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      console.warn('Social tables not set up yet.');
      return [];
    }
    if (error) throw error;
    if (!requests || requests.length === 0) return [];

    // Get profiles for the senders (including avatar_url for profile pictures)
    const senderIds = requests.map(r => r.from_user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, avatar_url')
      .in('id', senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Combine the data with profile picture support
    return requests.map(request => {
      const profile = profileMap.get(request.from_user_id);
      return {
        ...request,
        from_profile: profile || null,
        // Flatten for easier access
        displayName: profile?.display_name,
        username: profile?.username,
        profilePicture: profile?.avatar_url || null,
      };
    });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
};

/**
 * Get sent friend requests
 */
export const getSentRequests = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get requests first
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, to_user_id, created_at')
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!requests || requests.length === 0) return [];

    // Get profiles for the recipients
    const recipientIds = requests.map(r => r.to_user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials')
      .in('id', recipientIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Combine the data
    return requests.map(request => ({
      ...request,
      to_profile: profileMap.get(request.to_user_id) || null,
    }));
  } catch (error) {
    console.error('Error getting sent requests:', error);
    return [];
  }
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (requestId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('to_user_id', user.id)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Request not found' };
    }

    // Create friendship (bidirectional)
    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert([
        { user_id: user.id, friend_id: request.from_user_id },
        { user_id: request.from_user_id, friend_id: user.id },
      ]);

    if (friendshipError) throw friendshipError;

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    return { success: true };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Decline friend request
 */
export const declineFriendRequest = async (requestId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)
      .eq('to_user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error declining friend request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all friends with their stats
 */
export const getFriends = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get friend IDs
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    // Handle missing table
    if (friendError && (friendError.code === '42P01' || friendError.message?.includes('does not exist'))) {
      console.warn('Social tables not set up yet.');
      return [];
    }
    if (friendError) throw friendError;
    if (!friendships || friendships.length === 0) return [];

    const friendIds = friendships.map(f => f.friend_id);

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    if (profileError) throw profileError;

    // Get workout counts for this week for each friend
    const startOfWeek = getStartOfWeek();
    const friendsWithStats = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('date', startOfWeek);

        return {
          id: profile.id,
          name: profile.display_name || profile.username,
          displayName: profile.display_name,
          avatar: profile.avatar_initials || profile.username?.substring(0, 2).toUpperCase(),
          profilePicture: profile.avatar_url || null,
          username: profile.username,
          workoutsThisWeek: count || 0,
          weekStreak: profile.week_streak || 0,
        };
      })
    );

    return friendsWithStats;
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
};

/**
 * Remove friend
 */
export const removeFriend = async (friendId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Delete both directions of friendship
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ACTIVITY FEED
// ============================================

/**
 * Share a workout to the activity feed
 * If the workout was already shared, update it with the latest data
 */
export const shareWorkout = async (workout) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Check if this workout was already shared
    const { data: existing, error: fetchError } = await supabase
      .from('shared_workouts')
      .select('id, shared_at')
      .eq('user_id', user.id)
      .eq('workout_id', String(workout.id))
      .single();

    // Handle network errors gracefully
    if (fetchError && fetchError.message?.includes('Network request failed')) {
      console.warn('Network unavailable for share check, skipping');
      return { success: false, error: 'Network unavailable', offline: true };
    }

    if (existing) {
      // Update existing shared workout with latest data
      const { error } = await supabase
        .from('shared_workouts')
        .update({
          workout_name: workout.name,
          workout_type: workout.type,
          duration: workout.duration || 0,
          exercises: workout.exercises || [],
          // Keep original shared_at so it stays in chronological order
        })
        .eq('id', existing.id);

      if (error) {
        if (error.message?.includes('Network request failed')) {
          return { success: false, error: 'Network unavailable', offline: true };
        }
        throw error;
      }
      return { success: true, updated: true };
    } else {
      // Insert new shared workout (only if PGRST116 "no rows" or no error)
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Some other error occurred
        throw fetchError;
      }

      const { error } = await supabase
        .from('shared_workouts')
        .insert({
          user_id: user.id,
          workout_id: String(workout.id),
          workout_name: workout.name,
          workout_type: workout.type,
          duration: workout.duration || 0,
          exercises: workout.exercises || [],
          shared_at: new Date().toISOString(),
        });

      if (error) {
        if (error.message?.includes('Network request failed')) {
          return { success: false, error: 'Network unavailable', offline: true };
        }
        throw error;
      }
      return { success: true, updated: false };
    }
  } catch (error) {
    console.error('Error sharing workout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get activity feed (shared workouts from friends)
 */
export const getActivityFeed = async (limit = 20) => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get friend IDs
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    // Handle missing table
    if (friendError && (friendError.code === '42P01' || friendError.message?.includes('does not exist'))) {
      console.warn('Social tables not set up yet.');
      return [];
    }

    if (!friendships || friendships.length === 0) return [];

    const friendIds = friendships.map(f => f.friend_id);

    // Get shared workouts from friends
    const { data: workouts, error } = await supabase
      .from('shared_workouts')
      .select('id, workout_id, workout_name, workout_type, duration, exercises, shared_at, likes, user_id')
      .in('user_id', friendIds)
      .order('shared_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!workouts || workouts.length === 0) return [];

    // Get profiles for workout owners (include avatar_url for profile pictures)
    const ownerIds = [...new Set(workouts.map(w => w.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, avatar_url')
      .in('id', ownerIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Check which ones the current user has liked
    const { data: userLikes } = await supabase
      .from('workout_likes')
      .select('shared_workout_id')
      .eq('user_id', user.id);

    const likedIds = new Set((userLikes || []).map(l => l.shared_workout_id));

    // Get comment counts for all workouts
    const workoutIds = workouts.map(w => w.id);
    const { data: commentCounts } = await supabase
      .from('workout_comments')
      .select('shared_workout_id')
      .in('shared_workout_id', workoutIds);

    const commentCountMap = new Map();
    (commentCounts || []).forEach(c => {
      const count = commentCountMap.get(c.shared_workout_id) || 0;
      commentCountMap.set(c.shared_workout_id, count + 1);
    });

    // Format the data
    return workouts.map(item => {
      const profile = profileMap.get(item.user_id);
      return {
        id: item.id,
        friend: {
          id: profile?.id,
          name: profile?.display_name || profile?.username,
          avatar: profile?.avatar_initials || 'U',
          profilePicture: profile?.avatar_url || null,
        },
        workoutType: item.workout_type,
        workoutName: item.workout_name,
        duration: item.duration,
        exercises: item.exercises || [],
        timeAgo: getTimeAgo(item.shared_at),
        likes: item.likes || 0,
        isLiked: likedIds.has(item.id),
        commentCount: commentCountMap.get(item.id) || 0,
      };
    });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    return [];
  }
};

/**
 * Like a shared workout
 */
export const likeWorkout = async (sharedWorkoutId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    // Check if already liked
    const { data: existing } = await supabase
      .from('workout_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('shared_workout_id', sharedWorkoutId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('workout_likes')
        .delete()
        .eq('id', existing.id);

      // Decrement like count
      await supabase.rpc('decrement_likes', { workout_id: sharedWorkoutId });

      return { success: true, liked: false };
    } else {
      // Like
      await supabase
        .from('workout_likes')
        .insert({
          user_id: user.id,
          shared_workout_id: sharedWorkoutId,
        });

      // Increment like count
      await supabase.rpc('increment_likes', { workout_id: sharedWorkoutId });

      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Error liking workout:', error);
    return { success: false };
  }
};

/**
 * Delete a shared workout (only owner can delete)
 */
export const deleteSharedWorkout = async (sharedWorkoutId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Delete associated likes and comments first
    await supabase
      .from('workout_likes')
      .delete()
      .eq('shared_workout_id', sharedWorkoutId);

    await supabase
      .from('workout_comments')
      .delete()
      .eq('shared_workout_id', sharedWorkoutId);

    // Delete the shared workout
    const { error } = await supabase
      .from('shared_workouts')
      .delete()
      .eq('id', sharedWorkoutId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting shared workout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a shared workout by original workout_id
 * Called when the original workout is deleted
 */
export const deleteSharedWorkoutByWorkoutId = async (workoutId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Find the shared workout first to get its id for cleaning up likes/comments
    const { data: sharedWorkout } = await supabase
      .from('shared_workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('workout_id', String(workoutId))
      .single();

    if (sharedWorkout) {
      // Delete associated likes and comments first
      await supabase
        .from('workout_likes')
        .delete()
        .eq('shared_workout_id', sharedWorkout.id);

      await supabase
        .from('workout_comments')
        .delete()
        .eq('shared_workout_id', sharedWorkout.id);

      // Delete the shared workout
      const { error } = await supabase
        .from('shared_workouts')
        .delete()
        .eq('id', sharedWorkout.id);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    // Don't log network errors loudly - workout deletion still succeeded locally
    if (!error.message?.includes('Network request failed')) {
      console.error('Error deleting shared workout:', error);
    }
    return { success: false, error: error.message };
  }
};

// ============================================
// FRIEND PROFILE & STATS
// ============================================

/**
 * Get a user's full profile with stats
 */
export const getUserProfileWithStats = async (userId) => {
  try {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get total workout count
    const { count: totalWorkouts } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get user's auth data for created_at
    const { data: authData } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    // Get shared workouts (public)
    const { data: sharedWorkouts, error: sharedError } = await supabase
      .from('shared_workouts')
      .select('id, workout_id, workout_name, workout_type, duration, exercises, shared_at, likes')
      .eq('user_id', userId)
      .order('shared_at', { ascending: false });

    if (sharedError) {
      console.error('Error fetching shared workouts:', sharedError);
    }

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarInitials: profile.avatar_initials,
      avatarUrl: profile.avatar_url || null,
      weekStreak: profile.week_streak || 0,
      shareWorkouts: profile.share_workouts !== false,
      createdAt: profile.created_at || authData?.created_at,
      stats: {
        totalWorkouts: totalWorkouts || 0,
        highestWeekStreak: profile.highest_week_streak || profile.week_streak || 0,
      },
      sharedWorkouts: (sharedWorkouts || []).map(w => ({
        id: w.id,
        workoutId: w.workout_id,
        name: w.workout_name,
        type: w.workout_type,
        duration: w.duration,
        exercises: w.exercises || [],
        sharedAt: w.shared_at,
        likes: w.likes || 0,
      })),
    };
  } catch (error) {
    console.error('Error getting user profile with stats:', error);
    return null;
  }
};

/**
 * Update profile picture URL
 */
export const updateProfilePicture = async (avatarUrl) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload profile picture to Supabase storage and update profile
 * @param {string} imageUri - Local URI of the image
 * @returns {Promise<{success: boolean, avatarUrl?: string, error?: string}>}
 */
export const uploadProfilePicture = async (imageUri) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Get file extension from URI
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Convert blob to array buffer for Supabase
    const arrayBuffer = await new Response(blob).arrayBuffer();

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const updateResult = await updateProfilePicture(avatarUrl);
    if (!updateResult.success) {
      return updateResult;
    }

    return { success: true, avatarUrl };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
};

// ============================================
// PROFILE STATS UPDATE
// ============================================

/**
 * Calculate and update user's week streak
 * A "week streak" counts consecutive weeks where at least one workout was completed
 */
export const updateProfileStats = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    // Get all workouts for this user, sorted by date
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;

    // Get total workout count
    const totalWorkouts = workouts?.length || 0;

    // Calculate week streak
    let weekStreak = 0;

    if (workouts && workouts.length > 0) {
      // Get unique weeks with workouts (using Monday as start of week)
      const weeksWithWorkouts = new Set();
      workouts.forEach(w => {
        const date = new Date(w.date);
        const weekStart = getWeekStart(date);
        weeksWithWorkouts.add(weekStart);
      });

      // Sort weeks in descending order
      const sortedWeeks = Array.from(weeksWithWorkouts).sort((a, b) => new Date(b) - new Date(a));

      // Check if current or previous week has a workout
      const currentWeekStart = getWeekStart(new Date());
      const previousWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      // Start counting from the most recent active week
      if (sortedWeeks.length > 0) {
        const mostRecentWeek = sortedWeeks[0];

        // Only count streak if the most recent workout week is current week or last week
        if (mostRecentWeek === currentWeekStart || mostRecentWeek === previousWeekStart) {
          weekStreak = 1;

          // Count consecutive weeks backward
          for (let i = 1; i < sortedWeeks.length; i++) {
            const expectedPrevWeek = getWeekStart(new Date(new Date(sortedWeeks[i - 1]).getTime() - 7 * 24 * 60 * 60 * 1000));
            if (sortedWeeks[i] === expectedPrevWeek) {
              weekStreak++;
            } else {
              break;
            }
          }
        }
      }
    }

    // Update profile with basic stats (week_streak should exist)
    // Use only columns that are guaranteed to exist
    const updateData = {
      week_streak: weekStreak,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    // If update fails due to missing column, try without week_streak
    if (updateError) {
      if (updateError.code === 'PGRST204') {
        // Column doesn't exist - just log and continue
        console.warn('Some profile columns missing, skipping stats update');
        return { success: true, weekStreak, totalWorkouts };
      }
      throw updateError;
    }

    return { success: true, weekStreak, totalWorkouts };
  } catch (error) {
    // Don't log network errors loudly
    if (!error.message?.includes('Network request failed')) {
      console.error('Error updating profile stats:', error);
    }
    return { success: false, error: error.message };
  }
};

// Helper to get Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// ============================================
// COMMENTS
// ============================================

/**
 * Add a comment to a shared workout
 */
export const addComment = async (sharedWorkoutId, text) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase
      .from('workout_comments')
      .insert({
        user_id: user.id,
        shared_workout_id: sharedWorkoutId,
        text: text.trim(),
      })
      .select('id, text, created_at')
      .single();

    if (error) throw error;

    // Get user profile for the comment (including avatar_url)
    const profile = await getProfile(user.id);

    return {
      success: true,
      comment: {
        id: data.id,
        text: data.text,
        createdAt: data.created_at,
        user: {
          id: user.id,
          name: profile?.display_name || profile?.username || 'You',
          avatar: profile?.avatar_initials || 'U',
          profilePicture: profile?.avatar_url || null,
        },
      },
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get comments for a shared workout
 */
export const getComments = async (sharedWorkoutId) => {
  try {
    const { data: comments, error } = await supabase
      .from('workout_comments')
      .select('id, text, created_at, user_id')
      .eq('shared_workout_id', sharedWorkoutId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    // Get profiles for commenters (including avatar_url for profile pictures)
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return comments.map(comment => {
      const profile = profileMap.get(comment.user_id);
      return {
        id: comment.id,
        text: comment.text,
        createdAt: comment.created_at,
        timeAgo: getTimeAgo(comment.created_at),
        user: {
          id: comment.user_id,
          name: profile?.display_name || profile?.username || 'Unknown',
          avatar: profile?.avatar_initials || 'U',
          profilePicture: profile?.avatar_url || null,
        },
      };
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

/**
 * Delete a comment (only owner can delete)
 */
export const deleteComment = async (commentId) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('workout_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get comment count for a shared workout
 */
export const getCommentCount = async (sharedWorkoutId) => {
  try {
    const { count, error } = await supabase
      .from('workout_comments')
      .select('*', { count: 'exact', head: true })
      .eq('shared_workout_id', sharedWorkoutId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
