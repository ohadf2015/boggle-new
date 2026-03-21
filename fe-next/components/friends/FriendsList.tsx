'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Target,
  Bell,
  MessageCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SkeletonCard } from '@/components/ui/EnhancedLoading';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { useFriends } from '@/hooks/useFriends';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import Avatar from '@/components/Avatar';
import { FriendRow } from './FriendRow';
import { RequestRow } from './RequestRow';
import { ChallengeRow } from './ChallengeRow';
import { MessageThreadList } from './messaging/MessageThreadList';
import { MessageThread } from './messaging/MessageThread';
import { ChallengeInviteDialog } from './ChallengeInviteDialog';
import { AddFriendDialog } from './AddFriendDialog';
import { FriendDetailDialog } from './FriendDetailDialog';
import type { Friend } from '@/utils/friends';
import type { MessageThread as MessageThreadType } from '@/shared/types/friends';

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
    search,
  } = useFriends();

  const router = useRouter();

  const {
    threads,
    messages,
    unreadCount,
    sendMessage,
    loadMessages,
    markAsRead,
    sendChallenge,
  } = useFriendMessages();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThreadType | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);

  const handleAccept = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await acceptRequest(requestId);
    setActionLoading(null);
  }, [acceptRequest]);

  const handleDecline = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await declineRequest(requestId);
    setActionLoading(null);
  }, [declineRequest]);

  const handleCancelRequest = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await cancelRequest(requestId);
    setActionLoading(null);
  }, [cancelRequest]);

  const handleThreadClick = useCallback((thread: MessageThreadType) => {
    setSelectedThread(thread);
    loadMessages(thread.friendUserId);
  }, [loadMessages]);

  const handleSendMessage = useCallback((text: string) => {
    if (selectedThread) sendMessage(selectedThread.friendUserId, text);
  }, [selectedThread, sendMessage]);

  const handleMarkAsRead = useCallback(() => {
    if (selectedThread && messages.length > 0) {
      markAsRead(selectedThread.friendUserId, messages[0].messageId);
    }
  }, [selectedThread, messages, markAsRead]);

  const handleSendChallenge = useCallback(async (
    friendId: string,
    challengeType: 'new_game' | 'join_room'
  ) => {
    await sendChallenge(friendId, challengeType);
    setChallengeFriend(null);
  }, [sendChallenge]);

  const notificationCount = pendingRequests.length + pendingChallenges.length;

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className={cn(
        'p-4 rounded-neo border-2 text-center',
        isDark ? 'bg-slate-800 border-white/10' : 'bg-gray-50 border-gray-200',
        className
      )}>
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
          {t('friends.signInRequired')}
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className={cn(
        'p-4 rounded-neo border-2 space-y-3',
        isDark ? 'bg-slate-800 border-white/10' : 'bg-gray-50 border-gray-200',
        className
      )}>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} hasImage={false} lines={0} className="py-2 px-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} hasImage lines={1} className="py-3" />
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
        <EnhancedButton onClick={() => setShowAddFriend(true)} size="sm" haptic animation="pop" className="bg-neo-cyan text-neo-black">
          <UserPlus className="w-4 h-4" />
          {t('friends.add')}
        </EnhancedButton>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b-2 border-neo-black">
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
      <div className="min-h-[400px]">
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
                    <ChallengeRow key={challenge.id} challenge={challenge} isDark={isDark} />
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {friends.length > 0 ? (
                friends.map((friend, i) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * Math.min(i, 10), type: 'spring', stiffness: 350, damping: 24 }}
                  >
                    <FriendRow
                      friend={friend}
                      isDark={isDark}
                      onChallengeClick={() => setChallengeFriend(friend)}
                      onClick={() => setSelectedFriend(friend)}
                    />
                  </motion.div>
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
                    <motion.div
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
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {outgoingRequests.length > 0 && (
              <div className={cn('p-3 rounded-neo border-2', isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200')}>
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
          <MessageThreadList threads={threads} isLoading={false} unreadCount={unreadCount} onThreadClick={handleThreadClick} />
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

      <MessageThread
        thread={selectedThread}
        messages={messages}
        isLoading={false}
        isOpen={!!selectedThread}
        onClose={() => setSelectedThread(null)}
        onSendMessage={handleSendMessage}
        onChallenge={selectedThread ? () => {
          const friend = friends.find(f => f.odUserId === selectedThread.friendUserId);
          if (friend) { setChallengeFriend(friend); setSelectedThread(null); }
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
    </div>
  );
};

export default FriendsList;
