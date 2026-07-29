'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Target,
  Bell,
  MessageCircle,
  X,
  ChevronRight,
  ShieldOff,
  Handshake,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SkeletonCard } from '@/components/ui/EnhancedLoading';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { useFriends } from '@/hooks/useFriends';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import Avatar from '@/components/Avatar';
import { FriendRow } from './FriendRow';
import { RequestRow } from './RequestRow';
import { ChallengeRow } from './ChallengeRow';
import { MessageThreadList } from './messaging/MessageThreadList';
import { MessageThread } from './messaging/MessageThread';
import { ChallengeInviteDialog } from './ChallengeInviteDialog';
import { sendChallengeWithAck } from '@/lib/friends/sendChallengeWithAck';
import { AddFriendDialog } from './AddFriendDialog';
import { FriendDetailDialog } from './FriendDetailDialog';
import GiftModal from '@/components/social/GiftModal';
import { PactFriendSelector } from '@/components/engagement/PactFriendSelector';
import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
import { useSocketOptional } from '@/utils/SocketContext';
import type { Friend } from '@/utils/friends';
import type { MessageThread as MessageThreadType } from '@/shared/types/friends';
import { DAILY_GIFT_LIMIT, type GiftPayload } from '@/shared/utils/giftingRules';

interface FriendsListProps {
  onChallengeClick?: (friend: Friend) => void;
  compact?: boolean;
  className?: string;
}

type TabType = 'friends' | 'requests' | 'messages';

const FriendsList: React.FC<FriendsListProps> = ({
  onChallengeClick,
  compact = false,
  className,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { isAuthenticated, profile } = useAuth();
  const isDark = theme === 'dark';

  const {
    friends,
    pendingRequests,
    outgoingRequests,
    pendingChallenges,
    isLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    unblock,
    blockedUsers,
    search,
  } = useFriends();

  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab: TabType = (() => {
    const t = searchParams?.get('tab');
    return t === 'requests' || t === 'messages' || t === 'friends' ? t : 'friends';
  })();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const autoOpenedFriendRef = useRef<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedBlockedUser, setSelectedBlockedUser] = useState<Friend | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThreadType | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);
  const [giftFriend, setGiftFriend] = useState<Friend | null>(null);
  const [showPactSelector, setShowPactSelector] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const setIsInGame = useHideNavigation();

  const socketContext = useSocketOptional();
  const giftSocket = socketContext?.socket ?? null;
  const isGiftSocketConnected = socketContext?.isConnected ?? false;

  // Listen for incoming gift notifications
  useEffect(() => {
    if (!giftSocket || !isGiftSocketConnected) return;
    const handleGiftReceive = (data: { senderName: string; giftType: string; amount?: number }) => {
      toast.success(t('socialGift.received', { sender: data.senderName, type: t(`socialGift.type.${data.giftType}`) }));
    };
    giftSocket.on('gift:receive', handleGiftReceive);

    // When a challenge we SENT gets accepted, navigate sender to the room
    const handleChallengeAccepted = (data: { roomCode: string; toUsername?: string }) => {
      toast.success(t('friends.challenges.friendAccepted', { name: data.toUsername || '' }));
      router.push(`/${language}/multiplayer?room=${data.roomCode}`);
    };
    giftSocket.on('friends:challengeAccepted', handleChallengeAccepted);

    // Toast when a new challenge arrives
    const handleChallengeReceived = (data: { fromUsername?: string }) => {
      toast(t('friends.challenges.received', { name: data.fromUsername || '' }), { icon: '⚔️' });
    };
    giftSocket.on('friends:challengeReceived', handleChallengeReceived);

    // Toast when a challenge we SENT gets declined
    const handleChallengeDeclined = (data: { toUserId?: string; fromUserId?: string; fromUsername?: string; toUsername?: string }) => {
      // Only toast the challenger (fromUserId === challenger). Decliner already sees UI feedback.
      const name = data.toUsername || '';
      toast(t('friends.challengeDeclinedToast', { name }), { icon: '🚫' });
    };
    giftSocket.on('friends:challengeDeclined', handleChallengeDeclined);

    // Toast when a challenge we participated in completes (post-game result)
    const handleChallengeResult = (data: { winnerUserId: string | null; scores?: Record<string, number> }) => {
      const me = profile?.id;
      if (!me) return;
      const myScore = data.scores?.[me] ?? null;
      const opponentEntry = Object.entries(data.scores ?? {}).find(([uid]) => uid !== me);
      const opponentScore = opponentEntry?.[1] ?? null;
      const isTie = data.winnerUserId === null;
      const didWin = data.winnerUserId === me;
      const key = isTie ? 'friends.challenges.resultTie' : didWin ? 'friends.challenges.resultWin' : 'friends.challenges.resultLoss';
      const fallback = isTie ? "It's a tie!" : didWin ? 'You won the challenge!' : 'You lost the challenge.';
      toast(
        t(key, fallback, {
          mine: String(myScore ?? '?'),
          theirs: String(opponentScore ?? '?'),
        }),
        { icon: isTie ? '🤝' : didWin ? '🏆' : '💔' },
      );
    };
    giftSocket.on('friends:challengeResult', handleChallengeResult);

    // Toast when a new friend request arrives
    const handleRequestReceived = (data: { fromUsername?: string; fromDisplayName?: string }) => {
      const name = data.fromDisplayName || data.fromUsername || '';
      toast(t('friends.requestReceivedToast', { name }), { icon: '👋' });
    };
    giftSocket.on('friends:requestReceived', handleRequestReceived);

    return () => {
      giftSocket.off('gift:receive', handleGiftReceive);
      giftSocket.off('friends:challengeAccepted', handleChallengeAccepted);
      giftSocket.off('friends:challengeReceived', handleChallengeReceived);
      giftSocket.off('friends:challengeDeclined', handleChallengeDeclined);
      giftSocket.off('friends:challengeResult', handleChallengeResult);
      giftSocket.off('friends:requestReceived', handleRequestReceived);
    };
  }, [giftSocket, isGiftSocketConnected, t, router, language, profile?.id]);

  const {
    threads,
    messages,
    unreadCount,
    sendMessage,
    loadMessages,
    markAsRead,
    refreshThreads,
    setTyping,
    typingUsername,
    deleteMessage,
    acceptChallenge,
    declineChallenge,
  } = useFriendMessages(selectedThread?.friendUserId);

  // Track actual daily gifts remaining
  const [giftsUsedToday, setGiftsUsedToday] = useState(0);
  useEffect(() => {
    if (!giftSocket || !isGiftSocketConnected) return;
    // Ask backend for today's gift count on mount
    giftSocket.emit('gift:getDailyCount');
    const handleDailyCount = (data: { count: number }) => {
      setGiftsUsedToday(data.count);
    };
    giftSocket.on('gift:dailyCount', handleDailyCount);
    return () => { giftSocket.off('gift:dailyCount', handleDailyCount); };
  }, [giftSocket, isGiftSocketConnected]);


  const handleAccept = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    const result = await acceptRequest(requestId);
    setActionLoading(null);
    if (result?.success !== false) {
      toast.success(t('friends.requestAccepted'));
    }
  }, [acceptRequest, t]);

  const handleDecline = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await declineRequest(requestId);
    setActionLoading(null);
    toast(t('friends.requestDeclined'), { icon: '👋' });
  }, [declineRequest, t]);

  const handleCancelRequest = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await cancelRequest(requestId);
    setActionLoading(null);
    toast(t('friends.requestCancelled'), { icon: '✕' });
  }, [cancelRequest, t]);

  // Keep activeTab synced to ?tab= when URL changes (e.g., from push/toast deep-link)
  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t === 'requests' || t === 'messages' || t === 'friends') {
      setActiveTab((prev) => (prev === t ? prev : t));
    }
  }, [searchParams]);

  const handleThreadClick = useCallback((thread: MessageThreadType) => {
    setSelectedThread(thread);
    setIsInGame(true);
    loadMessages(thread.friendUserId);
  }, [loadMessages, setIsInGame]);

  // Open a message thread for a friend (creates temporary thread if none exists)
  const handleOpenMessageForFriend = useCallback((friend: Friend) => {
    // Check if a thread already exists
    const existingThread = threads.find(thr => thr.friendUserId === friend.odUserId);
    if (existingThread) {
      handleThreadClick(existingThread);
    } else {
      // Create a temporary thread object so MessageThread can render
      const tempThread: MessageThreadType = {
        conversationId: `temp_${friend.odUserId}`,
        friendUserId: friend.odUserId,
        friendUsername: friend.username,
        friendDisplayName: friend.displayName,
        friendAvatar: {
          emoji: '',
          color: '',
          image: friend.avatarImage,
          customAvatar: friend.customAvatar,
        },
        lastMessage: '',
        lastMessageAt: Date.now(),
        unreadCount: 0,
        isOnline: friend.isOnline,
      };
      setSelectedThread(tempThread);
      setIsInGame(true);
      loadMessages(friend.odUserId);
    }
    // Switch to messages tab
    setActiveTab('messages');
  }, [threads, handleThreadClick, loadMessages, setIsInGame]);

  // Auto-open thread when deep-link includes ?friendUserId=X (from push / toast / share)
  useEffect(() => {
    const friendUserId = searchParams?.get('friendUserId');
    if (!friendUserId) {
      autoOpenedFriendRef.current = null;
      return;
    }
    if (autoOpenedFriendRef.current === friendUserId) return;
    if (selectedThread?.friendUserId === friendUserId) {
      autoOpenedFriendRef.current = friendUserId;
      return;
    }
    const existing = threads.find((thr) => thr.friendUserId === friendUserId);
    if (existing) {
      autoOpenedFriendRef.current = friendUserId;
      handleThreadClick(existing);
      return;
    }
    const friend = friends.find((f) => f.odUserId === friendUserId);
    if (friend) {
      autoOpenedFriendRef.current = friendUserId;
      handleOpenMessageForFriend(friend);
    }
  }, [searchParams, threads, friends, selectedThread, handleThreadClick, handleOpenMessageForFriend]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (selectedThread) {
      await sendMessage(selectedThread.friendUserId, text);
      // Refresh threads so new conversations appear in the list
      refreshThreads();
    }
  }, [selectedThread, sendMessage, refreshThreads]);

  const handleMarkAsRead = useCallback(() => {
    if (selectedThread && messages.length > 0) {
      markAsRead(selectedThread.friendUserId, messages[messages.length - 1].messageId);
    }
  }, [selectedThread, messages, markAsRead]);

  const handleSendChallenge = useCallback(async (
    friendId: string,
    challengeType: 'new_game' | 'join_room',
    settings?: { language?: string; timerSeconds?: number; mode?: string; message?: string; flow?: 'async' | 'live' }
  ) => {
    // ASYNC flow — stash config; producer hook in SP results POSTs after game-end.
    if (settings?.flow === 'async') {
      try {
        sessionStorage.setItem(
          'pendingAsyncChallenge',
          JSON.stringify({
            friendUserId: friendId,
            friendUsername: challengeFriend?.displayName || challengeFriend?.username,
            gameMode: settings.mode || 'classic',
            language: settings.language || language || 'en',
            durationSeconds: settings.timerSeconds ?? 120,
            message: settings.message,
            createdAt: Date.now(),
          }),
        );
      } catch {
        toast.error(t('friends.errors.sendFailed'));
        throw new Error('STORAGE_FAILED');
      }
      toast.success(t('friends.challenges.async.playInstruction'));
      setChallengeFriend(null);
      router.push(`/${language}/?asyncChallenge=new`);
      return;
    }

    // LIVE flow — existing real-time MP path.
    if (!giftSocket || !isGiftSocketConnected) {
      toast.error(t('friends.errors.sendFailed'));
      throw new Error('NOT_CONNECTED');
    }
    const result = await sendChallengeWithAck(giftSocket, {
      friendUserId: friendId,
      challengeType,
      gameSettings: settings ? {
        language: settings.language,
        timerSeconds: settings.timerSeconds,
        mode: settings.mode,
      } : undefined,
      message: settings?.message,
    });
    if (!result.ok) {
      const fallback = t('friends.errors.sendFailed');
      const msg =
        result.code === 'NOT_FRIENDS' ? t('friends.challenges.errors.notFriends', fallback) :
        result.code === 'RATE_LIMITED' ? t('friends.challenges.errors.rateLimited', fallback) :
        result.code === 'TIMEOUT' ? t('friends.challenges.errors.timeout', fallback) :
        result.code === 'VALIDATION_FAILED' ? t('friends.challenges.errors.validation', fallback) :
        fallback;
      toast.error(msg);
      throw new Error(result.code);
    }
    toast.success(t('friends.challenges.sent'));
    setChallengeFriend(null);
    if (result.data.roomCode) {
      router.push(`/${language}/multiplayer?room=${result.data.roomCode}`);
    }
  }, [giftSocket, isGiftSocketConnected, t, router, language, challengeFriend]);

  // Gift sending via Socket.IO
  const handleSendGift = useCallback((gift: GiftPayload) => {
    if (!giftFriend) return;
    if (!giftSocket || !isGiftSocketConnected) {
      toast.error(t('socialGift.error'));
      return;
    }
    giftSocket.emit('gift:send', {
      recipientId: giftFriend.odUserId,
      giftType: gift.type,
      amount: gift.amount,
    });
    giftSocket.once('gift:sendResult', (result: { success: boolean; error?: string }) => {
      if (result.success) {
        toast.success(t('socialGift.sent'));
        setGiftsUsedToday(prev => prev + 1);
      } else {
        toast.error(result.error || t('socialGift.error'));
      }
    });
    setGiftFriend(null);
  }, [giftFriend, giftSocket, isGiftSocketConnected, t]);

  // Challenge accept: navigate both players to multiplayer room
  const handleAcceptChallenge = useCallback(async (challengeId: string) => {
    const roomCode = await acceptChallenge(challengeId);
    if (roomCode) {
      toast.success(t('friends.challenges.accepted'));
      router.push(`/${language}/multiplayer?room=${roomCode}`);
    } else {
      toast.error(t('friends.challenges.acceptFailed', 'Failed to accept challenge'));
    }
  }, [acceptChallenge, router, language, t]);

  const handleDeclineChallenge = useCallback(async (challengeId: string) => {
    await declineChallenge(challengeId);
    toast.success(t('friends.challenges.declined', 'Challenge declined'));
  }, [declineChallenge, t]);

  const notificationCount = pendingRequests.length + pendingChallenges.length;

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className={cn(
          'p-4 rounded-neo border-2 text-center space-y-3',
          isDark ? 'bg-neo-navy-light border-white/10' : 'bg-gray-50 border-gray-200',
          className
        )}>
          <Users className="w-8 h-8 mx-auto text-gray-400" />
          <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {t('friends.signInRequired')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <EnhancedButton
              onClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); }}
              size="sm"
              haptic
              animation="pop"
              className="bg-neo-lime text-neo-black mx-auto"
            >
              {t('auth.signUp')}
            </EnhancedButton>
            <EnhancedButton
              onClick={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
              size="sm"
              haptic
              animation="pop"
              className="bg-neo-pink text-white mx-auto"
            >
              {t('auth.signIn')}
            </EnhancedButton>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      </>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className={cn(
        'p-4 rounded-neo border-2 space-y-3',
        isDark ? 'bg-neo-navy-light border-white/10' : 'bg-gray-50 border-gray-200',
        className
      )}>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`skel-tab-${i}`} hasImage={false} lines={0} className="py-2 px-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={`skel-row-${i}`} hasImage lines={1} className="py-3" />
        ))}
      </div>
    );
  }

  // Compact view
  if (compact) {
    const sortedFriends = [...friends].sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
            <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
              {t('friends.title')}
            </span>
            {friends.length > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')}>
                {friends.length}
              </span>
            )}
          </div>
          {(notificationCount > 0 || unreadCount > 0) && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-neo-pink text-white rounded-full">
              {notificationCount + unreadCount > 9 ? '9+' : notificationCount + unreadCount}
            </span>
          )}
        </div>
        {sortedFriends.slice(0, 5).map(friend => (
          <FriendRow key={friend.id} friend={friend} isDark={isDark} compact onChallengeClick={onChallengeClick} />
        ))}
        {friends.length === 0 && (
          <p className={cn('text-xs text-center py-2', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {t('friends.noFriendsYet')}
          </p>
        )}
        {friends.length > 5 && (
          <button
            onClick={() => router.push(`/${language}/friends`)}
            className={cn(
              'w-full flex items-center justify-center gap-1 py-1.5 rounded-neo border-2 text-xs font-bold',
              isDark
                ? 'border-white/10 text-gray-300 hover:bg-white/5'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {t('friends.seeAll')} ({friends.length})
            <ChevronRight className="w-3 h-3 rtl:scale-x-[-1]" />
          </button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={cn('w-5 h-5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <h2 className={cn('font-black text-lg uppercase', isDark ? 'text-white' : 'text-gray-900')}>
            {t('friends.title')}
          </h2>
          {(notificationCount > 0 || unreadCount > 0) && (
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-neo-pink text-white rounded-full animate-pulse">
              {notificationCount + unreadCount > 9 ? '9+' : notificationCount + unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EnhancedButton onClick={() => setShowPactSelector(true)} size="sm" haptic animation="pop" className="bg-neo-pink text-white">
            <Handshake className="w-4 h-4" />
            {t('wordPact.formPact')}
          </EnhancedButton>
          <EnhancedButton onClick={() => setShowAddFriend(true)} size="sm" haptic animation="pop" className="bg-neo-cyan text-neo-black">
            <UserPlus className="w-4 h-4" />
            {t('friends.add')}
          </EnhancedButton>
        </div>
      </div>

      {/* Tab Navigation (Q-18: proper ARIA tab semantics) */}
      <div role="tablist" aria-label={t('friends.title')} className="flex gap-2 border-b-2 border-neo-black">
        {(['friends', 'requests', 'messages'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const icons = { friends: Users, requests: Bell, messages: MessageCircle };
          const labels = { friends: t('friends.title'), requests: t('friends.requests'), messages: t('friends.messages') };
          const Icon = icons[tab];
          const badge = tab === 'friends' ? (friends.length > 0 ? friends.length : null)
            : tab === 'requests' ? (notificationCount > 0 ? notificationCount : null)
            : (unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null);

          return (
            <button
              key={tab}
              role="tab"
              id={`friends-tab-${tab}`}
              aria-selected={isActive}
              aria-controls={`friends-panel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all',
                isActive
                  ? 'bg-neo-cyan text-neo-black border-2 border-neo-black border-b-0 -mb-0.5'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {labels[tab]}
              {badge !== null && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  tab === 'friends' && isActive ? 'bg-neo-black text-neo-cyan'
                    : tab === 'friends' ? (isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')
                    : 'flex items-center justify-center w-5 h-5 font-bold bg-neo-pink text-white'
                )}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`friends-panel-${activeTab}`} aria-labelledby={`friends-tab-${activeTab}`} className="min-h-[400px]">
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {pendingChallenges.length > 0 && (
              <div className={cn('p-3 rounded-neo border-2', isDark ? 'bg-neo-lime/20 border-neo-lime/40' : 'bg-yellow-50 border-yellow-300')}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-neo-lime" />
                  <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.challenges.pending')}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingChallenges.map(challenge => (
                    <ChallengeRow
                      key={challenge.id}
                      challenge={challenge}
                      isDark={isDark}
                      onAccept={handleAcceptChallenge}
                      onDecline={handleDeclineChallenge}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {friends.length > 0 ? (
                friends.map((friend, i) => (
                  <m.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * Math.min(i, 10), type: 'spring', stiffness: 350, damping: 24 }}
                  >
                    <FriendRow
                      friend={friend}
                      isDark={isDark}
                      onMessageClick={handleOpenMessageForFriend}
                      onGiftClick={() => setGiftFriend(friend)}
                      onChallengeClick={() => setChallengeFriend(friend)}
                      onClick={() => setSelectedFriend(friend)}
                    />
                  </m.div>
                ))
              ) : (
                <EnhancedEmptyState
                  title={t('friends.noFriendsYet')}
                  description={t('friends.addFriendsToChallenge')}
                  icon="sparkles"
                  action={{ label: t('friends.add'), onClick: () => setShowAddFriend(true), variant: 'primary' }}
                  compact
                />
              )}
            </div>

            {/* Blocked users section */}
            {blockedUsers.length > 0 && (
              <div className={cn('p-3 rounded-neo border-2 mt-4', isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300')}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                  <span className={cn('font-bold text-sm', isDark ? 'text-red-300' : 'text-red-700')}>
                    {t('friends.blockedUsers')}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600')}>
                    {blockedUsers.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {blockedUsers.map(user => (
                    <div
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedBlockedUser(user)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedBlockedUser(user);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-neo cursor-pointer',
                        isDark ? 'bg-black/20 hover:bg-black/40' : 'bg-white/50 hover:bg-white/80'
                      )}
                    >
                      <Avatar avatarImage={user.avatarImage} customAvatar={user.customAvatar} size="sm" />
                      <span className={cn('flex-1 font-bold text-sm truncate', isDark ? 'text-gray-300' : 'text-gray-600')}>
                        {user.displayName || user.username}
                      </span>
                      <span className={cn('text-xs', isDark ? 'text-red-400' : 'text-red-500')}>
                        {t('friends.blocked')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {pendingRequests.length > 0 && (
              <div className={cn('p-3 rounded-neo border-2', isDark ? 'bg-neo-pink/20 border-neo-pink/40' : 'bg-pink-50 border-pink-300')}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-neo-pink" />
                  <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.pendingRequests')}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingRequests.map((request, i) => (
                    <m.div
                      key={request.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, type: 'spring', stiffness: 350, damping: 24 }}
                    >
                      <RequestRow
                        request={request}
                        isDark={isDark}
                        isLoading={actionLoading === request.id}
                        onAccept={() => handleAccept(request.id)}
                        onDecline={() => handleDecline(request.id)}
                        language={language}
                      />
                    </m.div>
                  ))}
                </div>
              </div>
            )}
            {outgoingRequests.length > 0 && (
              <div className={cn('p-3 rounded-neo border-2', isDark ? 'bg-neo-navy-elevated/50 border-white/10' : 'bg-gray-50 border-gray-200')}>
                <p className={cn('text-xs font-bold mb-2', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {t('friends.sentRequests')}
                </p>
                <div className="space-y-2">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-sm">
                      <Avatar avatarImage={req.fromAvatarImage} customAvatar={req.fromCustomAvatar} size="sm" />
                      <span className={cn('flex-1', isDark ? 'text-gray-300' : 'text-gray-600')}>{req.fromUsername}</span>
                      <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        ({t('friends.pending')})
                      </span>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={actionLoading === req.id}
                        title={t('friends.cancelRequest')}
                        aria-label={t('friends.cancelRequest')}
                        className={cn(
                          'p-1 rounded border-2 border-neo-black shadow-hard-sm font-bold transition-opacity',
                          'bg-neo-pink text-white hover:opacity-80 disabled:opacity-40'
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingRequests.length === 0 && outgoingRequests.length === 0 && (
              <EnhancedEmptyState title={t('friends.noPendingRequests')} description={t('friends.requestsWillAppearHere')} icon="inbox" compact />
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <MessageThreadList
            threads={threads}
            isLoading={false}
            unreadCount={unreadCount}
            onThreadClick={handleThreadClick}
            onStartConversation={friends.length > 0 ? () => handleOpenMessageForFriend(friends[0]) : undefined}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddFriendDialog
        open={showAddFriend}
        onOpenChange={setShowAddFriend}
        isDark={isDark}
        t={t}
        search={search}
        sendRequest={sendRequest}
      />

      <FriendDetailDialog
        friend={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onChallenge={setChallengeFriend}
        onUnfriend={unfriend}
        isDark={isDark}
        t={t}
      />

      {/* Blocked user detail dialog */}
      <FriendDetailDialog
        friend={selectedBlockedUser}
        onClose={() => setSelectedBlockedUser(null)}
        onChallenge={() => {}}
        onUnfriend={() => Promise.resolve()}
        onUnblock={unblock}
        isBlockedUser
        isDark={isDark}
        t={t}
      />

      <MessageThread
        thread={selectedThread}
        messages={messages}
        isLoading={false}
        isOpen={!!selectedThread}
        typingUsername={typingUsername ?? undefined}
        onClose={() => { setSelectedThread(null); setIsInGame(false); }}
        onSendMessage={handleSendMessage}
        onTyping={selectedThread ? (isTyping: boolean) => setTyping(selectedThread.friendUserId, isTyping) : undefined}
        onDeleteMessage={deleteMessage}
        onChallenge={selectedThread ? () => {
          const friend = friends.find(f => f.odUserId === selectedThread.friendUserId);
          if (friend) { setChallengeFriend(friend); setSelectedThread(null); setIsInGame(false); }
        } : undefined}
        onMarkAsRead={handleMarkAsRead}
        currentUserId={profile?.id || ''}
      />

      {challengeFriend && (
        <ChallengeInviteDialog
          isOpen={!!challengeFriend}
          friendUsername={challengeFriend.displayName || challengeFriend.username}
          friendId={challengeFriend.odUserId}
          onClose={() => setChallengeFriend(null)}
          onSendChallenge={handleSendChallenge}
        />
      )}

      {giftFriend && (
        <GiftModal
          isOpen={!!giftFriend}
          onClose={() => setGiftFriend(null)}
          onSend={handleSendGift}
          recipientName={giftFriend.displayName || giftFriend.username}
          senderBalance={profile?.total_coins ?? 0}
          giftsRemaining={Math.max(0, DAILY_GIFT_LIMIT - giftsUsedToday)}
        />
      )}

      {showPactSelector && (
        <PactFriendSelector onClose={() => setShowPactSelector(false)} />
      )}
    </div>
  );
};

export default FriendsList;
