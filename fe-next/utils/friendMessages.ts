/**
 * Friend Messages Utilities
 * Supabase client functions for direct messaging between friends
 */

import { createClient } from '@/utils/supabase/client';
import type { Message, MessageThread, Challenge } from '@/shared/types/friends';
import logger from '@/utils/logger';

/**
 * Send a message to a friend
 */
export async function sendMessage(
  recipientId: string,
  message: string
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify friendship exists and no block in either direction (F-1, F-3)
    const { data: friendship } = await supabase
      .from('friends')
      .select('status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${user.id})`)
      .single();

    if (!friendship || friendship.status !== 'accepted') {
      return { success: false, error: 'Can only message friends' };
    }

    // Validate message length server-side
    const trimmed = message.trim();
    if (trimmed.length === 0 || trimmed.length > 1000) {
      return { success: false, error: 'Message must be 1-1000 characters' };
    }

    const { data, error } = await supabase
      .from('friend_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        message: trimmed,
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Failed to send message' };
    }

    // Map to Message type
    const conversationId = [user.id, recipientId].sort().join('_');
    const mappedMessage: Message = {
      messageId: data.id,
      conversationId,
      fromUserId: data.sender_id,
      toUserId: data.recipient_id,
      message: data.message,
      timestamp: new Date(data.created_at).getTime(),
      isRead: data.read || false,
      readAt: data.read_at ? new Date(data.read_at).getTime() : undefined,
      isDeleted: false,
    };

    return { success: true, message: mappedMessage };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception sending message: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get conversation messages with a friend (paginated)
 */
export async function getConversation(
  friendId: string,
  limit: number = 50,
  before?: number,
  userId?: string
): Promise<{ messages: Message[]; hasMore: boolean; oldestTimestamp: number }> {
  try {
    const supabase = createClient();
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!uid) {
      return { messages: [], hasMore: false, oldestTimestamp: 0 };
    }

    let query = supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`)
      .eq('deleted_for_sender', false)
      .eq('deleted_for_recipient', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check hasMore

    if (before) {
      const beforeDate = new Date(before).toISOString();
      query = query.lt('created_at', beforeDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error fetching messages: ${error.message}`);
      return { messages: [], hasMore: false, oldestTimestamp: 0 };
    }

    if (!data || data.length === 0) {
      return { messages: [], hasMore: false, oldestTimestamp: 0 };
    }

    const hasMore = data.length > limit;
    const messages = data.slice(0, limit);

    const conversationId = [uid, friendId].sort().join('_');
    const mappedMessages: Message[] = messages.map((msg) => ({
      messageId: msg.id,
      conversationId,
      fromUserId: msg.sender_id,
      toUserId: msg.recipient_id,
      message: msg.message,
      timestamp: new Date(msg.created_at).getTime(),
      isRead: msg.read || false,
      readAt: msg.read_at ? new Date(msg.read_at).getTime() : undefined,
      isDeleted: false,
    }));

    const oldestTimestamp = messages.length > 0
      ? new Date(messages[messages.length - 1].created_at).getTime()
      : 0;

    return { messages: mappedMessages, hasMore, oldestTimestamp };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception fetching messages: ${(error as Error).message}`);
    return { messages: [], hasMore: false, oldestTimestamp: 0 };
  }
}

/**
 * Mark messages as read up to a specific message
 */
export async function markMessagesRead(
  friendId: string,
  lastMessageId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Get the timestamp of the last read message
    const { data: lastMsg } = await supabase
      .from('friend_messages')
      .select('created_at')
      .eq('id', lastMessageId)
      .single();

    if (!lastMsg) {
      return { success: false };
    }

    // Mark all messages from friend to user as read up to that timestamp
    const { error } = await supabase
      .from('friend_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('sender_id', friendId)
      .eq('recipient_id', user.id)
      .eq('read', false)
      .lte('created_at', lastMsg.created_at);

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error marking messages read: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception marking messages read: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Get unread message count (optionally for specific friend)
 */
export async function getUnreadCount(friendId?: string, userId?: string): Promise<number> {
  try {
    const supabase = createClient();
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!uid) {
      return 0;
    }

    let query = supabase
      .from('friend_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', uid)
      .eq('read', false)
      .eq('deleted_for_recipient', false);

    if (friendId) {
      query = query.eq('sender_id', friendId);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error getting unread count: ${error.message}`);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception getting unread count: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Get all message threads with friends
 */
export async function getThreads(userId?: string): Promise<MessageThread[]> {
  try {
    const supabase = createClient();
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!uid) {
      return [];
    }

    // Get all accepted friendships
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    if (!friendships || friendships.length === 0) {
      return [];
    }

    const threads = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId = friendship.user_id === uid
          ? friendship.friend_id
          : friendship.user_id;

        // Get last message
        const { data: lastMsg } = await supabase
          .from('friend_messages')
          .select('message, created_at, sender_id')
          .or(`and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastMsg) return null;

        // Get friend profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_emoji, avatar_color, avatar_image, avatar_config, last_seen_at')
          .eq('id', friendId)
          .single();

        if (!profile) return null;

        // Get unread count — pass userId to avoid redundant auth.getUser() calls
        const unreadCount = await getUnreadCount(friendId, uid);

        const conversationId = [uid, friendId].sort().join('_');
        const isOnline = profile.last_seen_at &&
          new Date(profile.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000);

        const thread: MessageThread = {
          conversationId,
          friendUserId: friendId,
          friendUsername: profile.username,
          friendDisplayName: profile.display_name || undefined,
          friendAvatar: {
            emoji: profile.avatar_emoji || '👤',
            color: profile.avatar_color || '#808080',
            image: profile.avatar_image || undefined,
            customAvatar: profile.avatar_config || undefined,
          },
          lastMessage: lastMsg.message,
          lastMessageAt: new Date(lastMsg.created_at).getTime(),
          unreadCount,
          isOnline,
        };

        return thread;
      })
    );

    // Filter nulls and sort by last message time
    return threads
      .filter((t): t is MessageThread => t !== null)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  } catch (error) {
    const msg = (error as Error).message;
    if (msg?.includes('Lock broken') || msg?.includes('stole it')) {
      logger.debug('FRIEND_MESSAGES', `Lock contention getting threads: ${msg}`);
    } else {
      logger.error('FRIEND_MESSAGES', `Exception getting threads: ${msg}`);
    }
    return [];
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Get message to determine if user is sender or recipient
    const { data: msg } = await supabase
      .from('friend_messages')
      .select('sender_id, recipient_id')
      .eq('id', messageId)
      .single();

    if (!msg) {
      return { success: false };
    }

    // Soft delete based on user role
    const updateField = msg.sender_id === user.id
      ? 'deleted_for_sender'
      : 'deleted_for_recipient';

    const { error } = await supabase
      .from('friend_messages')
      .update({ [updateField]: true })
      .eq('id', messageId);

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error deleting message: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception deleting message: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Send a game challenge to a friend
 */
export async function sendChallenge(
  friendId: string,
  challengeType: 'new_game' | 'join_room',
  roomCode?: string,
  gameSettings?: { language?: string; timerSeconds?: number; mode?: string },
  message?: string
): Promise<{ success: boolean; challenge?: Challenge; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate challenge ID (room code for new_game type)
    const challengeId = challengeType === 'new_game'
      ? generateRoomCode()
      : roomCode!;

    const { data, error } = await supabase
      .from('friend_challenges')
      .insert({
        challenger_id: user.id,
        challenged_id: friendId,
        challenge_id: challengeId,
        challenge_type: challengeType,
        message,
        game_mode: gameSettings?.mode,
        game_language: gameSettings?.language,
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error sending challenge: ${error.message}`);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Failed to send challenge' };
    }

    // Get challenger profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_emoji, avatar_color, avatar_image')
      .eq('id', user.id)
      .single();

    const challenge: Challenge = {
      challengeId: data.id,
      fromUserId: data.challenger_id,
      fromUsername: profile?.username || '',
      fromDisplayName: profile?.display_name || undefined,
      fromAvatar: {
        emoji: profile?.avatar_emoji || '👤',
        color: profile?.avatar_color || '#808080',
        image: profile?.avatar_image || undefined,
      },
      toUserId: data.challenged_id,
      toUsername: '', // Will be populated by server
      challengeType: data.challenge_type as 'new_game' | 'join_room',
      roomCode: challengeId,
      gameSettings: {
        language: data.game_language || undefined,
        mode: data.game_mode || undefined,
      },
      message: data.message || undefined,
      status: 'pending',
      createdAt: new Date(data.created_at).getTime(),
      expiresAt: new Date(data.expires_at).getTime(),
    };

    return { success: true, challenge };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception sending challenge: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Accept a challenge
 */
export async function acceptChallenge(challengeId: string): Promise<{ success: boolean; roomCode?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Get challenge details
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('challenged_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!challenge) {
      return { success: false };
    }

    // Update status to accepted
    const { error } = await supabase
      .from('friend_challenges')
      .update({ status: 'accepted' })
      .eq('id', challengeId);

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error accepting challenge: ${error.message}`);
      return { success: false };
    }

    return { success: true, roomCode: challenge.challenge_id };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception accepting challenge: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Decline a challenge
 */
export async function declineChallenge(challengeId: string): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Only the challenged party can decline (F-2)
    const { error } = await supabase
      .from('friend_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId)
      .eq('challenged_id', user.id);

    if (error) {
      logger.error('FRIEND_MESSAGES', `Error declining challenge: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIEND_MESSAGES', `Exception declining challenge: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Get pending challenges
 */
export async function getPendingChallenges(userId?: string): Promise<{ sent: Challenge[]; received: Challenge[] }> {
  try {
    const supabase = createClient();
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!uid) {
      return { sent: [], received: [] };
    }

    // Get received challenges
    const { data: receivedData } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenged_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Get sent challenges
    const { data: sentData } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenger_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Map to Challenge type with profile data
    const received: Challenge[] = await Promise.all(
      (receivedData || []).map(async (c) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_emoji, avatar_color, avatar_image')
          .eq('id', c.challenger_id)
          .single();

        return {
          challengeId: c.id,
          fromUserId: c.challenger_id,
          fromUsername: profile?.username || '',
          fromDisplayName: profile?.display_name || undefined,
          fromAvatar: {
            emoji: profile?.avatar_emoji || '👤',
            color: profile?.avatar_color || '#808080',
            image: profile?.avatar_image || undefined,
          },
          toUserId: c.challenged_id,
          toUsername: '', // Current user
          challengeType: c.challenge_type as 'new_game' | 'join_room',
          roomCode: c.challenge_id,
          gameSettings: {
            language: c.game_language || undefined,
            mode: c.game_mode || undefined,
          },
          message: c.message || undefined,
          status: 'pending',
          createdAt: new Date(c.created_at).getTime(),
          expiresAt: new Date(c.expires_at).getTime(),
        };
      })
    );

    const sent: Challenge[] = await Promise.all(
      (sentData || []).map(async (c) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_emoji, avatar_color, avatar_image')
          .eq('id', c.challenged_id)
          .single();

        return {
          challengeId: c.id,
          fromUserId: c.challenger_id,
          fromUsername: '', // Current user
          fromDisplayName: undefined,
          fromAvatar: {
            emoji: '👤',
            color: '#808080',
          },
          toUserId: c.challenged_id,
          toUsername: profile?.username || '',
          challengeType: c.challenge_type as 'new_game' | 'join_room',
          roomCode: c.challenge_id,
          gameSettings: {
            language: c.game_language || undefined,
            mode: c.game_mode || undefined,
          },
          message: c.message || undefined,
          status: 'pending',
          createdAt: new Date(c.created_at).getTime(),
          expiresAt: new Date(c.expires_at).getTime(),
        };
      })
    );

    return { sent, received };
  } catch (error) {
    const msg = (error as Error).message;
    if (msg?.includes('Lock broken') || msg?.includes('stole it')) {
      logger.debug('FRIEND_MESSAGES', `Lock contention getting challenges: ${msg}`);
    } else {
      logger.error('FRIEND_MESSAGES', `Exception getting pending challenges: ${msg}`);
    }
    return { sent: [], received: [] };
  }
}

/**
 * Generate a 6-character room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
