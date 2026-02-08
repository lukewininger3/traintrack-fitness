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
      .select('id, username, display_name, avatar_initials')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) throw error;
    return data || [];
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

    // Get profiles for the senders
    const senderIds = requests.map(r => r.from_user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials')
      .in('id', senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Combine the data
    return requests.map(request => ({
      ...request,
      from_profile: profileMap.get(request.from_user_id) || null,
    }));
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
          avatar: profile.avatar_initials || profile.username?.substring(0, 2).toUpperCase(),
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
 */
export const shareWorkout = async (workout) => {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('shared_workouts')
      .insert({
        user_id: user.id,
        workout_id: workout.id,
        workout_name: workout.name,
        workout_type: workout.type,
        duration: workout.duration || 0,
        exercises: workout.exercises || [],
        shared_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
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

    // Get profiles for workout owners
    const ownerIds = [...new Set(workouts.map(w => w.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials')
      .in('id', ownerIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Check which ones the current user has liked
    const { data: userLikes } = await supabase
      .from('workout_likes')
      .select('shared_workout_id')
      .eq('user_id', user.id);

    const likedIds = new Set((userLikes || []).map(l => l.shared_workout_id));

    // Format the data
    return workouts.map(item => {
      const profile = profileMap.get(item.user_id);
      return {
        id: item.id,
        friend: {
          id: profile?.id,
          name: profile?.display_name || profile?.username,
          avatar: profile?.avatar_initials || 'U',
        },
        workoutType: item.workout_type,
        workoutName: item.workout_name,
        duration: item.duration,
        exercises: item.exercises || [],
        timeAgo: getTimeAgo(item.shared_at),
        likes: item.likes || 0,
        isLiked: likedIds.has(item.id),
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
