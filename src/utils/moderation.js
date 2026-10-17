import { Alert, Platform } from 'react-native';
import { supabase } from '../config/supabase';

// ============================================
// CONTENT FILTER
// ============================================

// Basic objectionable-language filter for user-generated text (comments,
// usernames, display names). Matches whole words, ignoring case.
const BLOCKED_WORDS = [
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bitch', 'cunt', 'dick',
  'cock', 'pussy', 'asshole', 'bastard', 'whore', 'slut', 'nigger', 'nigga',
  'faggot', 'fag', 'retard', 'kike', 'spic', 'chink', 'tranny', 'rape', 'kys',
];

const BLOCKED_PATTERN = new RegExp(`\\b(${BLOCKED_WORDS.join('|')})\\b`, 'i');

// Underscores and digits are treated as separators so usernames like
// "bad_word99" are caught too.
export const containsObjectionableContent = (text) =>
  typeof text === 'string' && BLOCKED_PATTERN.test(text.replace(/[_\d]+/g, ' '));

// ============================================
// BLOCKING
// ============================================

let blockedCache = null;

/**
 * Get the set of user IDs the current user has blocked.
 */
export const getBlockedUserIds = async ({ refresh = false } = {}) => {
  if (blockedCache && !refresh) return blockedCache;
  try {
    const { data, error } = await supabase.from('user_blocks').select('blocked_id');
    if (error) throw error;
    blockedCache = new Set((data || []).map(b => b.blocked_id));
  } catch (error) {
    console.error('Error loading blocked users:', error);
    blockedCache = blockedCache || new Set();
  }
  return blockedCache;
};

export const clearBlockedCache = () => {
  blockedCache = null;
};

/**
 * Block a user: hides their content and removes any friendship or pending requests.
 */
export const blockUser = async (userId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('user_blocks')
      .upsert({ blocker_id: user.id, blocked_id: userId }, { ignoreDuplicates: true });
    if (error) throw error;

    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

    await supabase
      .from('friend_requests')
      .delete()
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`);

    if (blockedCache) blockedCache.add(userId);
    return { success: true };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, error: error.message };
  }
};

export const unblockUser = async (userId) => {
  try {
    const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', userId);
    if (error) throw error;
    if (blockedCache) blockedCache.delete(userId);
    return { success: true };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get blocked users with profile info, for the Blocked Users screen.
 */
export const getBlockedUsers = async () => {
  try {
    const ids = [...(await getBlockedUserIds({ refresh: true }))];
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading blocked users:', error);
    return [];
  }
};

// ============================================
// REPORTING
// ============================================

export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech',
  'Sexual or inappropriate content',
  'Other',
];

// Android alerts render at most three buttons (two reasons + Cancel)
const ANDROID_REPORT_REASONS = ['Spam', 'Abusive or inappropriate'];

/**
 * File a report. Reports are reviewed in the Supabase dashboard (user_reports table).
 */
export const reportContent = async ({ contentType, reportedUserId, contentId = null, contentSnapshot = null, reason }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase.from('user_reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      content_type: contentType,
      content_id: contentId != null ? String(contentId) : null,
      content_snapshot: contentSnapshot,
      reason,
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error filing report:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// UI FLOWS (shared by every screen that shows other users' content)
// ============================================

const pickReportReason = (title) =>
  new Promise(resolve => {
    Alert.alert(
      title,
      'Why are you reporting this?',
      [
        ...(Platform.OS === 'ios' ? REPORT_REASONS : ANDROID_REPORT_REASONS).map(reason => ({ text: reason, onPress: () => resolve(reason) })),
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });

/**
 * Walk the user through reporting content, then offer to block the author.
 */
export const promptReport = async ({ contentType, reportedUserId, contentId, contentSnapshot, userName, onBlocked }) => {
  const title = contentType === 'user' ? 'Report User' : 'Report Comment';
  const reason = await pickReportReason(title);
  if (!reason) return;

  const result = await reportContent({ contentType, reportedUserId, contentId, contentSnapshot, reason });
  if (!result.success) {
    Alert.alert('Error', 'Could not send your report. Please try again.');
    return;
  }

  Alert.alert(
    'Thanks for reporting',
    `We'll review this within 24 hours and remove content that breaks our Terms. Do you also want to block ${userName || 'this user'}?`,
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => confirmBlock({ userId: reportedUserId, userName, onBlocked, skipConfirm: true }) },
    ]
  );
};

/**
 * Confirm and block a user.
 */
export const confirmBlock = ({ userId, userName, onBlocked, skipConfirm = false }) => {
  const doBlock = async () => {
    const result = await blockUser(userId);
    if (result.success) {
      Alert.alert('User Blocked', `You won't see content from ${userName || 'this user'} anymore. You can unblock them in Settings.`);
      onBlocked?.(userId);
    } else {
      Alert.alert('Error', 'Could not block this user. Please try again.');
    }
  };

  if (skipConfirm) {
    doBlock();
    return;
  }

  Alert.alert(
    `Block ${userName || 'this user'}?`,
    "They'll be removed from your friends and you won't see their workouts or comments.",
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: doBlock },
    ]
  );
};

/**
 * Long-press menu for a comment: delete your own, or report/block someone else's.
 */
export const showCommentActions = ({ comment, currentUserId, onDeleted, onBlocked, deleteComment }) => {
  const authorId = comment.user?.id;
  const authorName = comment.user?.name;

  if (authorId && authorId === currentUserId) {
    Alert.alert('Comment', null, [
      {
        text: 'Delete Comment',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteComment(comment.id);
          if (result.success) onDeleted?.(comment.id);
          else Alert.alert('Error', 'Could not delete comment.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
    return;
  }

  Alert.alert(authorName || 'Comment', null, [
    {
      text: 'Report Comment',
      onPress: () => promptReport({
        contentType: 'comment',
        reportedUserId: authorId,
        contentId: comment.id,
        contentSnapshot: comment.text,
        userName: authorName,
        onBlocked,
      }),
    },
    {
      text: `Block ${authorName || 'User'}`,
      style: 'destructive',
      onPress: () => confirmBlock({ userId: authorId, userName: authorName, onBlocked }),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
};

/**
 * Menu for another user's profile.
 */
export const showUserActions = ({ userId, userName, onBlocked }) => {
  Alert.alert(userName || 'User', null, [
    {
      text: 'Report User',
      onPress: () => promptReport({ contentType: 'user', reportedUserId: userId, userName, onBlocked }),
    },
    {
      text: 'Block User',
      style: 'destructive',
      onPress: () => confirmBlock({ userId, userName, onBlocked }),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
};
