'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Target,
  Circle,
  Bell,
  MessageCircle,
  UserMinus,
} from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { useFriends } from '@/hooks/useFriends';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import { FriendRow } from './FriendRow';
import { RequestRow } from './RequestRow';
import { ChallengeRow } from './ChallengeRow';
import { MessageThreadList } from './messaging/MessageThreadList';
import { MessageThread } from './messaging/MessageThread';
import { ChallengeInviteDialog } from './ChallengeInviteDialog';
import type { Friend } from '@/utils/friends';
import type { MessageThread as MessageThreadType } from '@/shared/types/friends';

interface FriendsListProps {
  onChallengeClick?: (friend: Friend) => void;
  compact?: boolean;
  className?: string;
}

type TabType = 'friends' | 'requests' | 'messages';

/**
 * FriendsList - Comprehensive friend management component
 *
 * Features:
 * - Tab navigation: Friends, Requests, Messages
 * - Friends list with online status indicators
 * - Pending friend requests (incoming/outgoing)
 * - Direct messaging with real-time updates
 * - Challenge friends directly
 */
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
    unfriend,
    search,
  } = useFriends();

  const {
    threads,
    messages,
    unreadCount,
    sendMessage,
    loadMessages,
    markAsRead,
    sendChallenge,
  } = useFriendMessages();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThreadType | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await search(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  // Handle send friend request
  const handleSendRequest = useCallback(async (userId: string) => {
    setActionLoading(userId);
    await sendRequest(userId);
    setActionLoading(null);
    setSearchQuery('');
    setSearchResults([]);
  }, [sendRequest]);

  // Handle accept request
  const handleAccept = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await acceptRequest(requestId);
    setActionLoading(null);
  }, [acceptRequest]);

  // Handle decline request
  const handleDecline = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    await declineRequest(requestId);
    setActionLoading(null);
  }, [declineRequest]);

  // Handle unfriend
  const handleUnfriend = useCallback(async (friendUserId: string) => {
    setActionLoading(friendUserId);
    await unfriend(friendUserId);
    setActionLoading(null);
    setSelectedFriend(null);
  }, [unfriend]);

  // Handle thread click
  const handleThreadClick = useCallback((thread: MessageThreadType) => {
    setSelectedThread(thread);
    loadMessages(thread.friendUserId);
  }, [loadMessages]);

  // Handle send message
  const handleSendMessage = useCallback((text: string) => {
    if (selectedThread) {
      sendMessage(selectedThread.friendUserId, text);
    }
  }, [selectedThread, sendMessage]);

  // Handle mark messages as read
  const handleMarkAsRead = useCallback(() => {
    if (selectedThread && messages.length > 0) {
      const lastMessage = messages[0];
      markAsRead(selectedThread.friendUserId, lastMessage.messageId);
    }
  }, [selectedThread, messages, markAsRead]);

  // Handle send challenge
  const handleSendChallenge = useCallback(async (
    friendId: string,
    challengeType: 'new_game' | 'join_room'
  ) => {
    await sendChallenge(friendId, challengeType);
    setChallengeFriend(null);
  }, [sendChallenge]);

  // Notification count
  const notificationCount = pendingRequests.length + pendingChallenges.length;

  // Not authenticated state
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

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        'p-4 rounded-neo border-2 flex items-center justify-center',
        isDark ? 'bg-slate-800 border-white/10' : 'bg-gray-50 border-gray-200',
        className
      )}>
        <NeoLoader variant="dots" size="md" />
      </div>
    );
  }

  // Compact view (for sidebar/drawer)
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
            <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
              {t('friends.title')}
            </span>
            {friends.length > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'
              )}>
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

        {/* Quick friend list */}
        {friends.slice(0, 5).map(friend => (
          <FriendRow
            key={friend.id}
            friend={friend}
            isDark={isDark}
            compact
            onChallengeClick={onChallengeClick}
          />
        ))}

        {friends.length === 0 && (
          <p className={cn('text-xs text-center py-2', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {t('friends.noFriendsYet')}
          </p>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add Friend button */}
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
        <Button
          onClick={() => setShowAddFriend(true)}
          size="sm"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
            'hover:shadow-hard hover:-translate-y-0.5 transition-all',
            'bg-neo-cyan text-neo-black font-bold text-sm'
          )}
        >
          <UserPlus className="w-4 h-4" />
          {t('friends.add')}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b-2 border-neo-black">
        <button
          onClick={() => setActiveTab('friends')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all',
            activeTab === 'friends'
              ? 'bg-neo-cyan text-neo-black border-2 border-neo-black border-b-0 -mb-0.5'
              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Users className="w-4 h-4" />
          {t('friends.title')}
          {friends.length > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              activeTab === 'friends'
                ? 'bg-neo-black text-neo-cyan'
                : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'
            )}>
              {friends.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all',
            activeTab === 'requests'
              ? 'bg-neo-cyan text-neo-black border-2 border-neo-black border-b-0 -mb-0.5'
              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Bell className="w-4 h-4" />
          {t('friends.requests')}
          {notificationCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-neo-pink text-white rounded-full">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all',
            activeTab === 'messages'
              ? 'bg-neo-cyan text-neo-black border-2 border-neo-black border-b-0 -mb-0.5'
              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          {t('friends.messages')}
          {unreadCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-neo-pink text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {/* Pending Challenges */}
            {pendingChallenges.length > 0 && (
              <div className={cn(
                'p-3 rounded-neo border-2',
                isDark ? 'bg-neo-lime/20 border-neo-lime/40' : 'bg-yellow-50 border-yellow-300'
              )}>
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
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="space-y-2">
              {friends.length > 0 ? (
                friends.map(friend => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    isDark={isDark}
                    onChallengeClick={() => setChallengeFriend(friend)}
                    onClick={() => setSelectedFriend(friend)}
                  />
                ))
              ) : (
                <div className={cn(
                  'text-center py-8 rounded-neo border-2',
                  isDark ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200'
                )}>
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className={cn('font-bold', isDark ? 'text-gray-300' : 'text-gray-600')}>
                    {t('friends.noFriendsYet')}
                  </p>
                  <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {t('friends.addFriendsToChallenge')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className={cn(
                'p-3 rounded-neo border-2',
                isDark ? 'bg-neo-pink/20 border-neo-pink/40' : 'bg-pink-50 border-pink-300'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-neo-pink" />
                  <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.pendingRequests')}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingRequests.map(request => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      isDark={isDark}
                      isLoading={actionLoading === request.id}
                      onAccept={() => handleAccept(request.id)}
                      onDecline={() => handleDecline(request.id)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className={cn(
                'p-3 rounded-neo border-2',
                isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <p className={cn('text-xs font-bold mb-2', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {t('friends.sentRequests')}
                </p>
                <div className="space-y-2">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-sm">
                      <Avatar
                        avatarImage={req.fromAvatarImage}
                        size="sm"
                      />
                      <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                        {req.fromUsername}
                      </span>
                      <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        ({t('friends.pending')})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className={cn(
                'text-center py-8 rounded-neo border-2',
                isDark ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className={cn('font-bold', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {t('friends.noPendingRequests')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <MessageThreadList
            threads={threads}
            isLoading={false}
            unreadCount={unreadCount}
            onThreadClick={handleThreadClick}
          />
        )}
      </div>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent
          noDescription
          className={cn(
            'max-w-md',
            isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {t('friends.addFriend')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                isDark ? 'text-gray-400' : 'text-gray-500'
              )} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('friends.searchByUsername')}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-neo border-2 font-medium',
                  isDark
                    ? 'bg-slate-700 border-white/10 text-white placeholder:text-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'
                )}
              />
              {isSearching && (
                <NeoLoader variant="dots" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Search results */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(searchUser => (
                <div
                  key={searchUser.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-neo border-2',
                    isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      avatarImage={searchUser.avatarImage}
                      size="md"
                    />
                    <div>
                      <p className={cn('font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                        {searchUser.displayName || searchUser.username}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        @{searchUser.username}
                      </p>
                    </div>
                  </div>

                  {searchUser.status === 'accepted' ? (
                    <span className={cn(
                      'text-xs font-bold px-2 py-1 rounded',
                      isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                    )}>
                      {t('friends.friend')}
                    </span>
                  ) : searchUser.status === 'pending' ? (
                    <span className={cn(
                      'text-xs font-bold px-2 py-1 rounded',
                      isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                    )}>
                      {t('friends.pending')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(searchUser.odUserId)}
                      disabled={actionLoading === searchUser.odUserId}
                      className={cn(
                        'px-3 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm',
                        'bg-neo-lime text-neo-black font-bold text-sm'
                      )}
                    >
                      {actionLoading === searchUser.odUserId ? (
                        <NeoLoader variant="dots" size="sm" />
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          {t('friends.add')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('friends.noUsersFound')}
                </p>
              )}

              {searchQuery.length < 2 && (
                <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('friends.typeAtLeast2Chars')}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Friend Detail Dialog */}
      <Dialog open={!!selectedFriend} onOpenChange={(open) => !open && setSelectedFriend(null)}>
        <DialogContent
          noDescription
          className={cn(
            'max-w-sm',
            isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
          )}
        >
          {selectedFriend && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar
                    avatarImage={selectedFriend.avatarImage}
                    size="lg"
                  />
                  <div>
                    <DialogTitle className="text-lg">
                      {selectedFriend.displayName || selectedFriend.username}
                    </DialogTitle>
                    <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      @{selectedFriend.username}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Online status */}
                <div className="flex items-center gap-2">
                  <Circle
                    className={cn('w-3 h-3', selectedFriend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400')}
                  />
                  <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                    {selectedFriend.isOnline ? t('common.online') : t('common.offline')}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    'p-3 rounded-neo border-2 text-center',
                    isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                  )}>
                    <p className={cn('text-xl font-black', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                      {selectedFriend.totalGames || 0}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {t('stats.games')}
                    </p>
                  </div>
                  <div className={cn(
                    'p-3 rounded-neo border-2 text-center',
                    isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                  )}>
                    <p className={cn('text-xl font-black', isDark ? 'text-purple-400' : 'text-purple-600')}>
                      {selectedFriend.currentLevel || 1}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {t('stats.level')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setChallengeFriend(selectedFriend);
                      setSelectedFriend(null);
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-neo',
                      'border-2 border-neo-black shadow-hard-sm',
                      'bg-neo-lime text-neo-black font-bold'
                    )}
                  >
                    <Target className="w-4 h-4" />
                    {t('friends.challenge')}
                  </Button>
                  <Button
                    onClick={() => handleUnfriend(selectedFriend.odUserId)}
                    disabled={actionLoading === selectedFriend.odUserId}
                    variant="outline"
                    className={cn(
                      'flex items-center gap-2 py-2.5 rounded-neo border-2',
                      isDark ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-red-300 text-red-600 hover:bg-red-50'
                    )}
                  >
                    {actionLoading === selectedFriend.odUserId ? (
                      <NeoLoader variant="dots" size="sm" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4" />
                        {t('friends.remove')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Thread Dialog */}
      <MessageThread
        thread={selectedThread}
        messages={messages}
        isLoading={false}
        isOpen={!!selectedThread}
        onClose={() => setSelectedThread(null)}
        onSendMessage={handleSendMessage}
        onChallenge={selectedThread ? () => {
          const friend = friends.find(f => f.odUserId === selectedThread.friendUserId);
          if (friend) {
            setChallengeFriend(friend);
            setSelectedThread(null);
          }
        } : undefined}
        onMarkAsRead={handleMarkAsRead}
        currentUserId={profile?.id || ''}
      />

      {/* Challenge Invite Dialog */}
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
