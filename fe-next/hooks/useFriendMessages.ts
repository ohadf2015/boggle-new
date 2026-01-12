/**
 * useFriendMessages Hook
 * Manages friend messaging with Socket.IO real-time updates + polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/utils/SocketContext';
import type { Message, MessageThread, Challenge } from '@/shared/types/friends';
import * as friendMessages from '@/utils/friendMessages';
import logger from '@/utils/logger';

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

  // Challenges
  sendChallenge: (friendId: string, type: 'new_game' | 'join_room', roomCode?: string) => Promise<void>;
  acceptChallenge: (challengeId: string) => Promise<string | null>;
  declineChallenge: (challengeId: string) => Promise<void>;
  pendingChallenges: { sent: Challenge[]; received: Challenge[] };
}

export function useFriendMessages(friendId?: string): UseFriendMessagesReturn {
  const { socket, isConnected } = useSocket();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingChallenges, setPendingChallenges] = useState<{ sent: Challenge[]; received: Challenge[] }>({
    sent: [],
    received: [],
  });

  const threadsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load message threads
   */
  const refreshThreads = useCallback(async () => {
    try {
      const fetchedThreads = await friendMessages.getThreads();
      setThreads(fetchedThreads);

      // Calculate total unread count
      const total = fetchedThreads.reduce((sum, t) => sum + t.unreadCount, 0);
      setUnreadCount(total);
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error refreshing threads: ${(err as Error).message}`);
    }
  }, []);

  /**
   * Load messages for a specific friend
   */
  const loadMessages = useCallback(async (targetFriendId: string, before?: number) => {
    if (!targetFriendId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { messages: fetchedMessages, hasMore } = await friendMessages.getConversation(
        targetFriendId,
        50,
        before
      );

      if (before) {
        // Append older messages
        setMessages((prev) => [...prev, ...fetchedMessages]);
      } else {
        // Replace with fresh messages
        setMessages(fetchedMessages);
      }
    } catch (err) {
      logger.error('USE_FRIEND_MESSAGES', `Error loading messages: ${(err as Error).message}`);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    const tempMessage: Message = {
      messageId: tempId || `temp-${now}`,
      conversationId: '', // Will be set by server
      fromUserId: '', // Will be set by server
      toUserId: recipientId,
      message: text.trim(),
      timestamp: now,
      isRead: false,
      isDeleted: false,
    };

    // Optimistic update
    setMessages((prev) => [tempMessage, ...prev]);

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
  }, [socket, isConnected, refreshThreads]);

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
          socket.emit('friends:acceptChallenge', { challengeId });

          // Wait for confirmation with room code
          socket.once('friends:challengeAccepted', (data: { roomCode: string }) => {
            resolve(data.roomCode);
          });

          // Timeout after 5 seconds
          setTimeout(() => resolve(null), 5000);
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
        setMessages((prev) => [message, ...prev]);
      }
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

    socket.on('friends:messageReceived', handleMessageReceived);
    socket.on('friends:messageSent', handleMessageSent);
    socket.on('friends:messagesRead', handleMessagesRead);
    socket.on('friends:challengeReceived', handleChallengeReceived);
    socket.on('friends:challengeAccepted', handleChallengeAccepted);

    return () => {
      socket.off('friends:messageReceived', handleMessageReceived);
      socket.off('friends:messageSent', handleMessageSent);
      socket.off('friends:messagesRead', handleMessagesRead);
      socket.off('friends:challengeReceived', handleChallengeReceived);
      socket.off('friends:challengeAccepted', handleChallengeAccepted);
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
   * Load pending challenges
   */
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const challenges = await friendMessages.getPendingChallenges();
        setPendingChallenges(challenges);
      } catch (err) {
        logger.error('USE_FRIEND_MESSAGES', `Error loading challenges: ${(err as Error).message}`);
      }
    };

    loadChallenges();

    // Poll every 60 seconds
    const interval = setInterval(loadChallenges, 60000);
    return () => clearInterval(interval);
  }, []);

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
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    pendingChallenges,
  };
}
