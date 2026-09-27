/**
 * Friends Social System Types
 * Type definitions for friend relationships, messaging, and challenges
 */

// ==================== Core Types ====================

export interface Friend {
  userId: string;
  username: string;
  displayName?: string;
  avatar: {
    emoji: string;
    color: string;
    image?: string;
  };
  isOnline: boolean;
  presenceStatus: 'online' | 'away' | 'dnd' | 'offline';
  lastSeen?: number;
  friendsSince: number;
  unreadCount: number; // Unread messages from this friend
}

export interface FriendRequest {
  requestId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatar: {
    emoji: string;
    color: string;
    image?: string;
  };
  toUserId: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  expiresAt: number;
}

export interface Message {
  messageId: string;
  conversationId: string; // Sorted userIds: `${min(a,b)}_${max(a,b)}`
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  readAt?: number;
  isDeleted: boolean;
  deletedAt?: number;
}

export interface MessageThread {
  conversationId: string;
  friendUserId: string;
  friendUsername: string;
  friendDisplayName?: string;
  friendAvatar: {
    emoji: string;
    color: string;
    image?: string;
    customAvatar?: import('./customAvatar').CustomAvatarConfig;
  };
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  isOnline: boolean;
}

export interface Challenge {
  challengeId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatar: {
    emoji: string;
    color: string;
    image?: string;
  };
  toUserId: string;
  toUsername: string;
  challengeType: 'new_game' | 'join_room';
  roomCode?: string; // For join_room type
  gameSettings?: {
    language?: string;
    timerSeconds?: number;
    mode?: string;
  };
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed';
  createdAt: number;
  expiresAt: number;
}

// ==================== Payload Types ====================

export interface SendFriendRequestPayload {
  targetUserId: string;
  targetUsername?: string;
}

export interface AcceptFriendRequestPayload {
  requestId: string;
}

export interface SendMessagePayload {
  recipientUserId: string;
  message: string;
  tempId?: string; // Client-side temp ID for optimistic updates
}

export interface GetMessagesPayload {
  friendUserId: string;
  before?: number; // Timestamp for pagination
  limit?: number; // Default 50, max 100
}

export interface MarkReadPayload {
  friendUserId: string;
  lastReadMessageId: string;
}

export interface SendChallengePayload {
  friendUserId: string;
  challengeType: 'new_game' | 'join_room';
  roomCode?: string;
  gameSettings?: {
    language?: string;
    timerSeconds?: number;
    mode?: string;
  };
  message?: string;
}

export interface SearchUsersPayload {
  query: string;
  limit?: number; // Default 20, max 50
}

export interface TypingPayload {
  recipientUserId: string;
  isTyping: boolean;
}

// ==================== Response Types ====================

export interface FriendsListResponse {
  friends: Friend[];
  onlineFriends: string[];
  timestamp: number;
}

export interface PendingRequestsResponse {
  sent: FriendRequest[];
  received: FriendRequest[];
}

export interface MessageHistoryResponse {
  friendUserId: string;
  messages: Message[];
  hasMore: boolean;
  oldestTimestamp: number;
}

export interface SearchUser {
  userId: string;
  username: string;
  displayName?: string;
  avatar: {
    emoji: string;
    color: string;
    image?: string;
  };
  isFriend: boolean;
  isPending: boolean; // Request sent or received
}

export interface SearchUsersResponse {
  users: SearchUser[];
  timestamp: number;
}

export interface MessageThreadsResponse {
  threads: MessageThread[];
  timestamp: number;
}

/** Row shape returned by the get_friend_threads Postgres RPC (one row per thread). */
export interface FriendThreadRow {
  friend_id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_image: string | null;
  avatar_config: import('./customAvatar').CustomAvatarConfig | null;
  last_seen_at: string | null;
  last_message: string;
  last_message_at: string;
  last_message_sender_id: string;
  unread_count: number;
}

export interface PendingChallengesResponse {
  sent: Challenge[];
  received: Challenge[];
}

// ==================== Socket Event Types ====================

export interface ClientToServerEvents {
  // Friend management
  'friends:sendRequest': (data: SendFriendRequestPayload) => void;
  'friends:acceptRequest': (data: AcceptFriendRequestPayload) => void;
  'friends:declineRequest': (data: { requestId: string }) => void;
  'friends:unfriend': (data: { friendUserId: string }) => void;
  'friends:block': (data: { targetUserId: string }) => void;
  'friends:unblock': (data: { targetUserId: string }) => void;
  'friends:getList': () => void;
  'friends:searchUsers': (data: SearchUsersPayload) => void;
  'friends:getPendingRequests': () => void;

  // Reporting (Social Apps & Features policy)
  'users:report': (data: { targetUserId: string; reason: string; context?: string }) => void;
  'messages:report': (data: {
    surface: 'direct_message' | 'room_chat';
    reason: string;
    context?: string;
    messageId?: string;
    targetUserId?: string;
    gameCode?: string;
    messageSnapshot?: { senderId?: string; senderName: string; message: string; timestamp: number };
  }) => void;

  // Messaging
  'friends:sendMessage': (data: SendMessagePayload) => void;
  'friends:getMessages': (data: GetMessagesPayload) => void;
  'friends:markRead': (data: MarkReadPayload) => void;
  'friends:typing': (data: TypingPayload) => void;
  'friends:deleteMessage': (data: { messageId: string }) => void;
  'friends:getThreads': () => void;

  // Challenges
  'friends:sendChallenge': (data: SendChallengePayload) => void;
  'friends:acceptChallenge': (data: { challengeId: string }) => void;
  'friends:declineChallenge': (data: { challengeId: string }) => void;
  'friends:getPendingChallenges': () => void;
  'friends:cancelChallenge': (data: { challengeId: string }) => void;
}

export interface ServerToClientEvents {
  // Friend management notifications
  'friends:requestReceived': (data: FriendRequest) => void;
  'friends:requestSent': (data: FriendRequest) => void;
  'friends:requestAccepted': (data: FriendRequest) => void;
  'friends:friendRemoved': (data: { friendUserId: string; timestamp: number }) => void;
  'friends:list': (data: FriendsListResponse) => void;
  'friends:pendingRequests': (data: PendingRequestsResponse) => void;

  // Messaging notifications
  'friends:messageReceived': (data: Message) => void;
  'friends:messageSent': (data: { messageId: string; tempId?: string; timestamp: number }) => void;
  'friends:messageHistory': (data: MessageHistoryResponse) => void;
  'friends:threads': (data: MessageThreadsResponse) => void;
  'friends:userTyping': (data: { userId: string; username: string; isTyping: boolean }) => void;
  'friends:messagesRead': (data: { friendUserId: string; lastReadMessageId: string; timestamp: number }) => void;
  'friends:messageDeleted': (data: { messageId: string; conversationId: string; timestamp: number }) => void;

  // Challenge notifications
  'friends:challengeReceived': (data: Challenge) => void;
  'friends:challengeSent': (data: Challenge) => void;
  'friends:challengeAccepted': (data: Challenge & { roomCode: string }) => void;
  'friends:challengeDeclined': (data: Challenge) => void;
  'friends:challengeExpired': (data: { challengeId: string; timestamp: number }) => void;
  'friends:pendingChallenges': (data: PendingChallengesResponse) => void;

  // Presence notifications
  'friends:friendOnline': (data: { userId: string; username: string; timestamp: number }) => void;
  'friends:friendOffline': (data: { userId: string; timestamp: number }) => void;

  // Reporting confirmation
  'report:submitted': (data: { success: boolean; timestamp: number }) => void;

  // Error events
  'friends:error': (data: { code: string; message: string; details?: unknown }) => void;
}

// ==================== Error Codes ====================

export const FriendErrorCodes = {
  FRIEND_NOT_FOUND: 'FRIEND_NOT_FOUND',
  REQUEST_ALREADY_EXISTS: 'REQUEST_ALREADY_EXISTS',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  CANNOT_ADD_SELF: 'CANNOT_ADD_SELF',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  USER_BLOCKED: 'USER_BLOCKED',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  MESSAGE_EMPTY: 'MESSAGE_EMPTY',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
  CHALLENGE_ALREADY_SENT: 'CHALLENGE_ALREADY_SENT',
  CANNOT_CHALLENGE_SELF: 'CANNOT_CHALLENGE_SELF',
  NOT_FRIENDS: 'NOT_FRIENDS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type FriendErrorCode = typeof FriendErrorCodes[keyof typeof FriendErrorCodes];
