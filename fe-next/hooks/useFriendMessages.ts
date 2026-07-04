/**
 * useFriendMessages Hook
 * Manages friend messaging with Socket.IO real-time updates + polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Message, MessageThread, Challenge } from '@/shared/types/friends';
import * as friendMessages from '@/utils/friendMessages';
import logger from '@/utils/logger';
import { useVisibilityPausedInterval } from './useVisibilityPausedInterval';

interface UseFriendMessagesReturn {
  // State
  threads: MessageThread[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;

  // Actions
  sendMessage: (recipientId: string, text: string, tempId?: string) => Promise<void>;
  loadMessages: (friendId: string, before?: number) => Promise<void>;
  markAsRead: (friendId: string, lastMessageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
  setTyping: (recipientId: string, isTyping: boolean) => void;

  // Typing
  typingUsername: string | null;

  // Challenges
  sendChallenge: (friendId: string, type: 'new_game' | 'join_room', roomCode?: string) => Promise<void>;
  acceptChallenge: (challengeId: string) => Promise<string | null>;
  declineChallenge: (challengeId: string) => Promise<void>;
  pendingChallenges: { sent: Challenge[]; received: Challenge[] };
}

export function useFriendMessages(
  friendId?: string,
  onMessage?: (message: Message) => void
): UseFriendMessagesReturn {
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  const socketContext = useSocketOptional();
  const socket = socketContext?.socket ?? null;
  const isConnected = socketContext?.isConnected ?? false;
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingChallenges, setPendingChallenges] = useState<{ sent: Challenge[]; received: Challenge[] }>({
    sent: [],
    received: [],
  });
  const [typingUsername, setTypingUsername] = useState<string | null>(null);

  const threadsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Guards against overlapping conversation fetches. The 5s offline-poll fallback
  // re-fires loadMessages on an interval; under a slow network the previous
  // getConversation can still be in flight, stacking duplicate friend_messages
  // requests (Sentry N+1 API-call on /admin/analytics). Skip a fresh-load poll
  // while one is already running (pagination `before` loads are still allowed).
  const loadInFlightRef = useRef(false);

  /**
   * Load message threads
   */
  const refreshThreads = useCallback(async () => {
    try {
      const fetchedThreads = await friendMessages.getThreads(user?.id);
      setThreads(fetchedThreads);

      // Calculate total unread count
      const total = fetchedThreads.reduce((sum, t) => sum + t.unreadCount, 0);
      setUnreadCount(total);
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error refreshing threads: ${(err as Error).message}`);
    }
  }, [user?.id]);

  /**
   * Load messages for a specific friend
   */
  const loadMessages = useCallback(async (targetFriendId: string, before?: number) => {
    if (!targetFriendId) return;
    // Drop overlapping fresh-load polls (a slow getConversation still in flight).
    if (loadInFlightRef.current && !before) return;
    loadInFlightRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const { messages: fetchedMessages } = await friendMessages.getConversation(
        targetFriendId,
        50,
        before,
        user?.id
      );

      // Messages come newest-first from DB — reverse to show oldest at top
      const chronological = [...fetchedMessages].reverse();

      if (before) {
        // Prepend older messages (they go before existing ones)
        setMessages((prev) => [...chronological, ...prev]);
      } else {
        // Replace with fresh messages
        setMessages(chronological);
      }
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error loading messages: ${(err as Error).message}`);
      setError('Failed to load messages');
    } finally {
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Send a message (optimistic UI update)
   */
  const sendMessage = useCallback(async (
    recipientId: string,
    text: string,
    tempId?: string
  ) => {
    if (!text.trim()) return;

    const now = Date.now();
    const currentUserId = user?.id ?? '';
    const tempMessage: Message = {
      messageId: tempId || `temp-${now}`,
      conversationId: currentUserId && recipientId
        ? [currentUserId, recipientId].sort().join('_')
        : '',
      fromUserId: currentUserId, // Use real user ID so bubble renders on correct side (F-9)
      toUserId: recipientId,
      message: text.trim(),
      timestamp: now,
      isRead: false,
      isDeleted: false,
    };

    // Optimistic update — append to end (newest-last, chronological)
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Send via Socket.IO if connected, otherwise fallback to HTTP
      if (socket && isConnected) {
        socket.emit('friends:sendMessage', {
          recipientUserId: recipientId,
          message: text.trim(),
          tempId: tempMessage.messageId,
        });
      } else {
        // HTTP fallback
        const { success, message: sentMessage, error: sendError } = await friendMessages.sendMessage(
          recipientId,
          text.trim()
        );

        if (success && sentMessage) {
          // Replace temp message with real one
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === tempMessage.messageId ? sentMessage : msg
            )
          );
        } else {
          // Remove temp message on failure
          setMessages((prev) => prev.filter((msg) => msg.messageId !== tempMessage.messageId));
          setError(sendError || 'Failed to send message');
        }
      }

      // Refresh threads to update last message
      await refreshThreads();
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error sending message: ${(err as Error).message}`);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempMessage.messageId));
      setError('Failed to send message');
    }
  }, [socket, isConnected, refreshThreads, user?.id]);

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(async (targetFriendId: string, lastMessageId: string) => {
    try {
      if (socket && isConnected) {
        socket.emit('friends:markRead', {
          friendUserId: targetFriendId,
          lastReadMessageId: lastMessageId,
        });
      } else {
        await friendMessages.markMessagesRead(targetFriendId, lastMessageId);
      }

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.fromUserId === targetFriendId && !msg.isRead
            ? { ...msg, isRead: true, readAt: Date.now() }
            : msg
        )
      );

      await refreshThreads();
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error marking messages read: ${(err as Error).message}`);
    }
  }, [socket, isConnected, refreshThreads]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      if (socket && isConnected) {
        socket.emit('friends:deleteMessage', { messageId });
      } else {
        await friendMessages.deleteMessage(messageId);
      }

      // Optimistically remove from UI
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error deleting message: ${(err as Error).message}`);
    }
  }, [socket, isConnected]);

  /**
   * Send typing indicator (debounced)
   */
  const setTyping = useCallback((recipientId: string, isTyping: boolean) => {
    if (!socket || !isConnected) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('friends:typing', {
      recipientUserId: recipientId,
      isTyping,
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit('friends:typing', {
            recipientUserId: recipientId,
            isTyping: false,
          });
        }
      }, 3000);
    }
  }, [socket, isConnected]);

  /**
   * Send challenge
   */
  const sendChallenge = useCallback(async (
    targetFriendId: string,
    type: 'new_game' | 'join_room',
    roomCode?: string
  ) => {
    try {
      if (socket && isConnected) {
        socket.emit('friends:sendChallenge', {
          friendUserId: targetFriendId,
          challengeType: type,
          roomCode,
        });
      } else {
        await friendMessages.sendChallenge(targetFriendId, type, roomCode);
      }
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error sending challenge: ${(err as Error).message}`);
      throw err;
    }
  }, [socket, isConnected]);

  /**
   * Accept challenge
   */
  const acceptChallenge = useCallback(async (challengeId: string): Promise<string | null> => {
    try {
      if (socket && isConnected) {
        return new Promise((resolve) => {
          let settled = false;
          const settle = (val: string | null) => {
            if (settled) return;
            settled = true;
            socket.off('friends:challengeAccepted', onAccepted);
            socket.off('friends:error', onError);
            resolve(val);
          };
          // Filter by challengeId — without this, an unrelated accept event
          // for a different challenge could resolve us with the wrong roomCode.
          const onAccepted = (data: { challengeId?: string; roomCode: string }) => {
            if (data?.challengeId !== challengeId) return;
            settle(data.roomCode);
          };
          const onError = () => settle(null);

          socket.on('friends:challengeAccepted', onAccepted);
          socket.on('friends:error', onError);
          socket.emit('friends:acceptChallenge', { challengeId });

          setTimeout(() => settle(null), 5000);
        });
      } else {
        const { success, roomCode } = await friendMessages.acceptChallenge(challengeId);
        return success && roomCode ? roomCode : null;
      }
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error accepting challenge: ${(err as Error).message}`);
      return null;
    }
  }, [socket, isConnected]);

  /**
   * Decline challenge
   */
  const declineChallenge = useCallback(async (challengeId: string) => {
    try {
      if (socket && isConnected) {
        socket.emit('friends:declineChallenge', { challengeId });
      } else {
        await friendMessages.declineChallenge(challengeId);
      }

      // Remove from pending challenges
      setPendingChallenges((prev) => ({
        sent: prev.sent.filter((c) => c.challengeId !== challengeId),
        received: prev.received.filter((c) => c.challengeId !== challengeId),
      }));
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error declining challenge: ${(err as Error).message}`);
    }
  }, [socket, isConnected]);

  /**
   * Socket.IO event listeners
   */
  useEffect(() => {
    if (!socket) return;

    // Message received
    const handleMessageReceived = (message: Message) => {
      // Only add if viewing this conversation or update thread
      if (friendId && (message.fromUserId === friendId || message.toUserId === friendId)) {
        setMessages((prev) => [...prev, message]);
      }
      onMessageRef.current?.(message);
      refreshThreads();
    };

    // Message sent confirmation (replace temp message)
    const handleMessageSent = (data: { messageId: string; tempId?: string; timestamp: number }) => {
      if (data.tempId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === data.tempId
              ? { ...msg, messageId: data.messageId, timestamp: data.timestamp }
              : msg
          )
        );
      }
    };

    // Messages read confirmation
    const handleMessagesRead = (data: { friendUserId: string; lastReadMessageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.toUserId === data.friendUserId && !msg.isRead
            ? { ...msg, isRead: true, readAt: Date.now() }
            : msg
        )
      );
    };

    // Challenge received
    const handleChallengeReceived = (challenge: Challenge) => {
      setPendingChallenges((prev) => ({
        ...prev,
        received: [challenge, ...prev.received],
      }));
    };

    // Challenge accepted
    const handleChallengeAccepted = (data: { challengeId: string; roomCode: string }) => {
      setPendingChallenges((prev) => ({
        sent: prev.sent.filter((c) => c.challengeId !== data.challengeId),
        received: prev.received.filter((c) => c.challengeId !== data.challengeId),
      }));
    };

    // Typing indicator (F-13 — was dead code because this listener was never registered)
    const handleTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      if (friendId && data.userId === friendId) {
        setTypingUsername(data.isTyping ? data.username : null);
        // Auto-clear after 4s in case stop-typing event is missed
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUsername(null), 4000);
        }
      }
    };

    socket.on('friends:messageReceived', handleMessageReceived);
    socket.on('friends:messageSent', handleMessageSent);
    socket.on('friends:messagesRead', handleMessagesRead);
    socket.on('friends:challengeReceived', handleChallengeReceived);
    socket.on('friends:challengeAccepted', handleChallengeAccepted);
    socket.on('friends:userTyping', handleTyping);

    return () => {
      socket.off('friends:messageReceived', handleMessageReceived);
      socket.off('friends:messageSent', handleMessageSent);
      socket.off('friends:messagesRead', handleMessagesRead);
      socket.off('friends:challengeReceived', handleChallengeReceived);
      socket.off('friends:challengeAccepted', handleChallengeAccepted);
      socket.off('friends:userTyping', handleTyping);
    };
  }, [socket, friendId, refreshThreads]);

  /**
   * Polling fallback for threads (when Socket.IO disconnected)
   */
  useEffect(() => {
    // Initial load
    refreshThreads();

    // Poll threads every 30 seconds (stop if Socket.IO connected)
    threadsIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        refreshThreads();
      }
    }, 30000);

    return () => {
      if (threadsIntervalRef.current) {
        clearInterval(threadsIntervalRef.current);
      }
    };
  }, [isConnected, refreshThreads]);

  /**
   * Refresh immediately when a push notification arrives for a friend message
   * while the socket may not be connected yet (e.g. app foregrounded from
   * background). Without this, recipients wait up to 30s for the next poll.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<Record<string, string>>).detail;
      if (detail?.type === 'direct_message') {
        refreshThreads();
        if (friendId) loadMessages(friendId);
      }
    };
    window.addEventListener('lexiclash:push-received', handler as EventListener);
    return () => {
      window.removeEventListener('lexiclash:push-received', handler as EventListener);
    };
  }, [friendId, refreshThreads, loadMessages]);

  /**
   * Polling fallback for active conversation messages (when Socket.IO disconnected)
   */
  useEffect(() => {
    if (!friendId) {
      if (messagesIntervalRef.current) {
        clearInterval(messagesIntervalRef.current);
      }
      return;
    }

    // Initial load
    loadMessages(friendId);

    // Poll messages every 5 seconds for active conversation (stop if Socket.IO connected)
    messagesIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        loadMessages(friendId);
      }
    }, 5000);

    return () => {
      if (messagesIntervalRef.current) {
        clearInterval(messagesIntervalRef.current);
      }
    };
  }, [friendId, isConnected, loadMessages]);

  /**
   * Load pending challenges — initial load on mount/user change, then poll every
   * 60s, paused while the tab is hidden (no point fetching in a background tab).
   */
  const loadChallenges = useCallback(async () => {
    try {
      const challenges = await friendMessages.getPendingChallenges(user?.id);
      setPendingChallenges(challenges);
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error loading challenges: ${(err as Error).message}`);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useVisibilityPausedInterval(loadChallenges, 60000);

  return {
    threads,
    messages,
    isLoading,
    error,
    unreadCount,
    sendMessage,
    loadMessages,
    markAsRead,
    deleteMessage,
    refreshThreads,
    setTyping,
    typingUsername,
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    pendingChallenges,
  };
}
