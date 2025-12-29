'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Loader2,
  Target,
  Trophy,
  Circle,
  Bell,
  ChevronRight,
  MessageCircle,
  UserMinus,
} from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Friend, FriendRequest, FriendChallenge } from '@/utils/friends';

interface FriendsListProps {
  onChallengeClick?: (friend: Friend) => void;
  compact?: boolean;
  className?: string;
}

/**
 * FriendsList - Comprehensive friend management component
 *
 * Features:
 * - Friends list with online status indicators
 * - Pending friend requests (incoming/outgoing)
 * - Direct challenge notifications
 * - Search and add friends
 * - Challenge friends directly
 */
const FriendsList: React.FC<FriendsListProps> = ({
  onChallengeClick,
  compact = false,
  className,
}) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
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
    refresh,
  } = useFriends();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
          {language === 'he' ? 'התחבר כדי להוסיף חברים' : 'Sign in to add friends'}
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
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
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
              {language === 'he' ? 'חברים' : 'Friends'}
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
          {notificationCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-neo-pink text-white rounded-full">
              {notificationCount}
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
            {language === 'he' ? 'אין חברים עדיין' : 'No friends yet'}
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
            {language === 'he' ? 'חברים' : 'Friends'}
          </h2>
          {notificationCount > 0 && (
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-neo-pink text-white rounded-full animate-pulse">
              {notificationCount}
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
          {language === 'he' ? 'הוסף' : 'Add'}
        </Button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className={cn(
          'p-3 rounded-neo border-2',
          isDark ? 'bg-neo-pink/20 border-neo-pink/40' : 'bg-pink-50 border-pink-300'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-neo-pink" />
            <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
              {language === 'he' ? 'בקשות ממתינות' : 'Friend Requests'}
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

      {/* Pending Challenges */}
      {pendingChallenges.length > 0 && (
        <div className={cn(
          'p-3 rounded-neo border-2',
          isDark ? 'bg-neo-yellow/20 border-neo-yellow/40' : 'bg-yellow-50 border-yellow-300'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-neo-yellow" />
            <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
              {language === 'he' ? 'אתגרים' : 'Challenges'}
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
              onChallengeClick={onChallengeClick}
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
              {language === 'he' ? 'אין חברים עדיין' : 'No friends yet'}
            </p>
            <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
              {language === 'he' ? 'הוסיפו חברים כדי לאתגר אותם!' : 'Add friends to challenge them!'}
            </p>
          </div>
        )}
      </div>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent className={cn(
          'max-w-md',
          isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {language === 'he' ? 'הוסף חבר' : 'Add Friend'}
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
                placeholder={language === 'he' ? 'חפש לפי שם משתמש...' : 'Search by username...'}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-neo border-2 font-medium',
                  isDark
                    ? 'bg-slate-700 border-white/10 text-white placeholder:text-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'
                )}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-cyan-500" />
              )}
            </div>

            {/* Search results */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(user => (
                <div
                  key={user.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-neo border-2',
                    isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 border-neo-black"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.avatarEmoji}
                    </div>
                    <div>
                      <p className={cn('font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                        {user.displayName || user.username}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  {user.status === 'accepted' ? (
                    <span className={cn(
                      'text-xs font-bold px-2 py-1 rounded',
                      isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                    )}>
                      {language === 'he' ? 'חבר' : 'Friend'}
                    </span>
                  ) : user.status === 'pending' ? (
                    <span className={cn(
                      'text-xs font-bold px-2 py-1 rounded',
                      isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                    )}>
                      {language === 'he' ? 'ממתין' : 'Pending'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.odUserId)}
                      disabled={actionLoading === user.odUserId}
                      className={cn(
                        'px-3 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm',
                        'bg-neo-lime text-neo-black font-bold text-sm'
                      )}
                    >
                      {actionLoading === user.odUserId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          {language === 'he' ? 'הוסף' : 'Add'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {language === 'he' ? 'לא נמצאו תוצאות' : 'No users found'}
                </p>
              )}

              {searchQuery.length < 2 && (
                <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {language === 'he' ? 'הקלידו לפחות 2 תווים' : 'Type at least 2 characters'}
                </p>
              )}
            </div>

            {/* Outgoing requests */}
            {outgoingRequests.length > 0 && (
              <div className={cn(
                'p-3 rounded-neo border-2',
                isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <p className={cn('text-xs font-bold mb-2', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {language === 'he' ? 'בקשות שנשלחו' : 'Sent Requests'}
                </p>
                {outgoingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-neo-black"
                      style={{ backgroundColor: req.fromAvatarColor }}
                    >
                      {req.fromAvatarEmoji}
                    </div>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      {req.fromUsername}
                    </span>
                    <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                      ({language === 'he' ? 'ממתין' : 'pending'})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Friend Detail Dialog */}
      <Dialog open={!!selectedFriend} onOpenChange={(open) => !open && setSelectedFriend(null)}>
        <DialogContent className={cn(
          'max-w-sm',
          isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
        )}>
          {selectedFriend && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-3 border-neo-black"
                    style={{ backgroundColor: selectedFriend.avatarColor }}
                  >
                    {selectedFriend.avatarEmoji}
                  </div>
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
                    {selectedFriend.isOnline
                      ? (language === 'he' ? 'מחובר עכשיו' : 'Online now')
                      : (language === 'he' ? 'לא מחובר' : 'Offline')}
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
                      {language === 'he' ? 'משחקים' : 'Games'}
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
                      {language === 'he' ? 'רמה' : 'Level'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {onChallengeClick && (
                    <Button
                      onClick={() => {
                        onChallengeClick(selectedFriend);
                        setSelectedFriend(null);
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-neo',
                        'border-2 border-neo-black shadow-hard-sm',
                        'bg-neo-yellow text-neo-black font-bold'
                      )}
                    >
                      <Target className="w-4 h-4" />
                      {language === 'he' ? 'אתגר' : 'Challenge'}
                    </Button>
                  )}
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
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4" />
                        {language === 'he' ? 'הסר' : 'Remove'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper components

interface FriendRowProps {
  friend: Friend;
  isDark: boolean;
  compact?: boolean;
  onChallengeClick?: (friend: Friend) => void;
  onClick?: () => void;
}

const FriendRow: React.FC<FriendRowProps> = ({
  friend,
  isDark,
  compact,
  onChallengeClick,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ x: compact ? 0 : 2 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo border-2 cursor-pointer transition-colors',
        isDark
          ? 'bg-slate-700/50 border-white/10 hover:border-cyan-500/50'
          : 'bg-white border-gray-200 hover:border-cyan-400',
        compact && 'p-1.5'
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'rounded-full flex items-center justify-center border-2 border-neo-black',
            compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'
          )}
          style={{ backgroundColor: friend.avatarColor }}
        >
          {friend.avatarEmoji}
        </div>
        <Circle
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3',
            friend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-bold truncate',
          compact ? 'text-xs' : 'text-sm',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          {friend.displayName || friend.username}
        </p>
        {!compact && (
          <p className={cn('text-xs truncate', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {friend.isOnline ? 'Online' : 'Offline'}
          </p>
        )}
      </div>

      {onChallengeClick && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChallengeClick(friend);
          }}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          )}
        >
          <Target className="w-4 h-4 text-neo-yellow" />
        </button>
      )}

      {!compact && <ChevronRight className={cn('w-4 h-4', isDark ? 'text-gray-500' : 'text-gray-400')} />}
    </motion.div>
  );
};

interface RequestRowProps {
  request: FriendRequest;
  isDark: boolean;
  isLoading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  language: string;
}

const RequestRow: React.FC<RequestRowProps> = ({
  request,
  isDark,
  isLoading,
  onAccept,
  onDecline,
  language,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-neo',
      isDark ? 'bg-black/20' : 'bg-white/50'
    )}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-neo-black"
        style={{ backgroundColor: request.fromAvatarColor }}
      >
        {request.fromAvatarEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {request.fromUsername}
        </p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onAccept}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button
          onClick={onDecline}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40' : 'bg-red-100 text-red-600 hover:bg-red-200'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ChallengeRowProps {
  challenge: FriendChallenge;
  isDark: boolean;
  language: string;
}

const ChallengeRow: React.FC<ChallengeRowProps> = ({
  challenge,
  isDark,
  language,
}) => {
  return (
    <a
      href={`/challenge/${challenge.challengeCode}`}
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo transition-colors',
        isDark ? 'bg-black/20 hover:bg-black/40' : 'bg-white/50 hover:bg-white/80'
      )}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-neo-black"
        style={{ backgroundColor: challenge.challengerAvatarColor }}
      >
        {challenge.challengerAvatarEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {challenge.challengerUsername}
        </p>
        <p className={cn('text-xs truncate', isDark ? 'text-yellow-300' : 'text-yellow-600')}>
          {challenge.message || (language === 'he' ? 'מזמין אותך לאתגר!' : 'challenges you!')}
        </p>
      </div>
      <Target className="w-5 h-5 text-neo-yellow" />
    </a>
  );
};

export default FriendsList;
