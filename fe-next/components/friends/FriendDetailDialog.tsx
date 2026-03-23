'use client';

import { useState, useCallback, useEffect } from 'react';
import { Target, Circle, UserMinus, ShieldOff, ShieldBan, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import { getHeadToHead, type Friend, type HeadToHeadRecord } from '@/utils/friends';

interface FriendDetailDialogProps {
  friend: Friend | null;
  onClose: () => void;
  onChallenge: (friend: Friend) => void;
  onUnfriend: (friendUserId: string) => Promise<{ success: boolean; error?: string } | void>;
  onMessage?: (friend: Friend) => void;
  onBlock?: (userId: string) => Promise<{ success: boolean; error?: string }>;
  onUnblock?: (userId: string) => Promise<{ success: boolean; error?: string }>;
  isBlockedUser?: boolean;
  isDark: boolean;
  t: (key: string) => string;
}

export function FriendDetailDialog({
  friend,
  onClose,
  onChallenge,
  onUnfriend,
  onMessage,
  onBlock,
  onUnblock,
  isBlockedUser = false,
  isDark,
  t,
}: FriendDetailDialogProps): React.JSX.Element {
  const [actionLoading, setActionLoading] = useState(false);
  const [h2h, setH2H] = useState<HeadToHeadRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<'unfriend' | 'block' | null>(null);

  useEffect(() => {
    if (friend?.odUserId && !isBlockedUser) {
      getHeadToHead(friend.odUserId).then(setH2H);
    } else {
      setH2H(null);
    }
  }, [friend?.odUserId, isBlockedUser]);

  // Reset confirm state when dialog opens/closes
  useEffect(() => {
    setConfirmAction(null);
  }, [friend?.odUserId]);

  const handleUnfriend = useCallback(async () => {
    if (!friend) return;
    if (confirmAction !== 'unfriend') {
      setConfirmAction('unfriend');
      return;
    }
    setActionLoading(true);
    await onUnfriend(friend.odUserId);
    setActionLoading(false);
    toast.success(t('friends.removedSuccess'));
    onClose();
  }, [friend, onUnfriend, onClose, confirmAction, t]);

  const handleBlock = useCallback(async () => {
    if (!friend || !onBlock) return;
    if (confirmAction !== 'block') {
      setConfirmAction('block');
      return;
    }
    setActionLoading(true);
    await onBlock(friend.odUserId);
    setActionLoading(false);
    toast.success(t('friends.blockedSuccess'));
    onClose();
  }, [friend, onBlock, onClose, confirmAction, t]);

  const handleUnblock = useCallback(async () => {
    if (!friend || !onUnblock) return;
    setActionLoading(true);
    await onUnblock(friend.odUserId);
    setActionLoading(false);
    toast.success(t('friends.unblockedSuccess'));
    onClose();
  }, [friend, onUnblock, onClose, t]);

  return (
    <Dialog open={!!friend} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        className={cn(
          'max-w-sm border-3 border-neo-black shadow-hard-lg',
          isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
        )}
      >
        {friend && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar
                  avatarImage={friend.avatarImage}
                  customAvatar={friend.customAvatar}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm"
                />
                <div>
                  <DialogTitle className="text-lg font-black">
                    {friend.displayName || friend.username}
                  </DialogTitle>
                  <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    @{friend.username}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 p-4 overflow-y-auto">
              {/* Online status */}
              <div className="flex items-center gap-2">
                <Circle
                  className={cn(
                    'w-3 h-3',
                    isBlockedUser
                      ? 'text-red-500 fill-red-500'
                      : friend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400'
                  )}
                />
                <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {isBlockedUser
                    ? t('friends.blocked')
                    : friend.isOnline ? t('common.online') : t('common.offline')
                  }
                </span>
              </div>

              {/* Stats (hide for blocked users) */}
              {!isBlockedUser && (
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    'p-3 rounded-neo border-2 border-neo-black text-center',
                    isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                  )}>
                    <p className="text-xl font-black text-neo-cyan">
                      {friend.totalGames || 0}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {t('stats.games')}
                    </p>
                  </div>
                  <div className={cn(
                    'p-3 rounded-neo border-2 border-neo-black text-center',
                    isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                  )}>
                    <p className="text-xl font-black text-neo-pink">
                      {friend.currentLevel || 1}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {t('stats.level')}
                    </p>
                  </div>
                </div>
              )}

              {/* Head to Head (hide for blocked users) */}
              {!isBlockedUser && h2h && h2h.totalGames > 0 && (
                <div className={cn(
                  'p-3 rounded-neo border-2 border-neo-black',
                  isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                )}>
                  <p className={cn('text-xs font-bold mb-2 uppercase tracking-wide', isDark ? 'text-gray-300' : 'text-gray-600')}>
                    {t('friends.headToHead.title')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center mb-1">
                    <div>
                      <p className="text-lg font-black text-green-500">{h2h.myWins}</p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {t('friends.headToHead.wins')}
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-400">{h2h.draws}</p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {t('friends.headToHead.draws')}
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-red-500">{h2h.theirWins}</p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {t('friends.headToHead.losses')}
                      </p>
                    </div>
                  </div>
                  <p className={cn('text-xs text-center mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                    {h2h.totalGames} {t('friends.headToHead.totalGames')}
                  </p>
                </div>
              )}

              {/* Confirmation banner */}
              {confirmAction && (
                <div className={cn(
                  'p-3 rounded-neo border-2 text-center',
                  confirmAction === 'block'
                    ? 'bg-red-500/20 border-red-500/40'
                    : 'bg-neo-pink/20 border-neo-pink/40'
                )}>
                  <p className={cn('text-sm font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {confirmAction === 'unfriend'
                      ? t('friends.confirmRemove')
                      : t('friends.confirmBlock')
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setConfirmAction(null)}
                      className={cn(
                        'px-4 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                        'font-bold text-sm',
                        isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      )}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={confirmAction === 'unfriend' ? handleUnfriend : handleBlock}
                      disabled={actionLoading}
                      className={cn(
                        'px-4 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                        'font-bold text-sm',
                        confirmAction === 'block'
                          ? 'bg-red-500 text-white'
                          : 'bg-neo-pink text-white'
                      )}
                    >
                      {actionLoading ? <Loader size="sm" /> : t('common.confirm')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {isBlockedUser ? (
                  <Button
                    onClick={handleUnblock}
                    disabled={actionLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-neo',
                      'border-2 border-neo-black shadow-hard-sm',
                      'bg-neo-cyan text-neo-black font-bold',
                      'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                    )}
                  >
                    {actionLoading ? (
                      <Loader size="sm" />
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        {t('friends.unblock')}
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => { onChallenge(friend); onClose(); }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-neo',
                        'border-2 border-neo-black shadow-hard-sm',
                        'bg-neo-lime text-neo-black font-bold',
                        'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                      )}
                    >
                      <Target className="w-4 h-4" />
                      {t('friends.challenge')}
                    </Button>
                    {onMessage && (
                      <Button
                        onClick={() => { onMessage(friend); onClose(); }}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2.5 rounded-neo',
                          'border-2 border-neo-black shadow-hard-sm',
                          'bg-neo-orange text-white font-bold',
                          'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                        )}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('friends.messages')}
                      </Button>
                    )}
                    <div className="flex gap-1">
                      <Button
                        onClick={handleUnfriend}
                        disabled={actionLoading}
                        title={t('friends.remove')}
                        className={cn(
                          'flex items-center gap-1 py-2.5 px-2 rounded-neo',
                          'border-2 border-neo-black shadow-hard-sm',
                          'bg-neo-pink text-white font-bold',
                          'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                        )}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                      {onBlock && (
                        <Button
                          onClick={handleBlock}
                          disabled={actionLoading}
                          title={t('friends.block')}
                          className={cn(
                            'flex items-center gap-1 py-2.5 px-2 rounded-neo',
                            'border-2 border-neo-black shadow-hard-sm',
                            'bg-red-600 text-white font-bold',
                            'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                          )}
                        >
                          <ShieldBan className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
