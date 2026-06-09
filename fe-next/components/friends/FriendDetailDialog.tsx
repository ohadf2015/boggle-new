'use client';

import { useState, useCallback, useEffect } from 'react';
import { Target, Circle, UserMinus, ShieldOff, Ban } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import { getHeadToHead, type Friend, type HeadToHeadRecord } from '@/utils/friends';

interface FriendDetailDialogProps {
  friend: Friend | null;
  onClose: () => void;
  onChallenge: (friend: Friend) => void;
  onUnfriend: (friendUserId: string) => Promise<{ success: boolean; error?: string } | void>;
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
  onBlock,
  onUnblock,
  isBlockedUser = false,
  isDark: _isDark,
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

  const handleUnfriend = useCallback(async () => {
    if (!friend) return;
    if (confirmAction !== 'unfriend') {
      setConfirmAction('unfriend');
      return;
    }
    setActionLoading(true);
    await onUnfriend(friend.odUserId);
    setActionLoading(false);
    onClose();
  }, [friend, onUnfriend, onClose, confirmAction]);

  const handleBlock = useCallback(async () => {
    if (!friend || !onBlock) return;
    if (confirmAction !== 'block') {
      setConfirmAction('block');
      return;
    }
    setActionLoading(true);
    await onBlock(friend.odUserId);
    setActionLoading(false);
    onClose();
  }, [friend, onBlock, onClose, confirmAction]);

  const handleUnblock = useCallback(async () => {
    if (!friend || !onUnblock) return;
    setActionLoading(true);
    await onUnblock(friend.odUserId);
    setActionLoading(false);
    onClose();
  }, [friend, onUnblock, onClose]);

  const headerVariant: 'cyan' | 'pink' = isBlockedUser ? 'pink' : 'cyan';

  return (
    <Dialog open={!!friend} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription closeButtonLabel={t('common.close')} className="max-w-sm">
        {friend && (
          <>
            <DialogHeader variant={headerVariant} className="text-start">
              <div className="flex items-center gap-3">
                <Avatar
                  avatarImage={friend.avatarImage}
                  customAvatar={friend.customAvatar}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm"
                />
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-black truncate">
                    {friend.displayName || friend.username}
                  </DialogTitle>
                  <p className="text-sm font-bold opacity-80 truncate">@{friend.username}</p>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4">
              {/* Online status pill */}
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  isBlockedUser
                    ? 'bg-neo-red/15 text-neo-red'
                    : friend.isOnline
                      ? 'bg-neo-lime text-neo-black'
                      : 'bg-neo-cream dark:bg-neo-navy-light text-current/70'
                )}
              >
                <Circle
                  className={cn(
                    'w-2.5 h-2.5',
                    isBlockedUser
                      ? 'text-neo-red fill-neo-red'
                      : friend.isOnline
                        ? 'text-neo-black fill-neo-black'
                        : 'text-current/50'
                  )}
                />
                <span className="text-xs font-black uppercase tracking-wide">
                  {isBlockedUser
                    ? t('friends.blocked')
                    : friend.isOnline
                      ? t('common.online')
                      : t('common.offline')}
                </span>
              </div>

              {/* Stats — neo cards */}
              {!isBlockedUser && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-neo border-3 border-neo-black bg-neo-cyan-muted dark:bg-neo-navy-light shadow-hard-sm text-center">
                    <p className="text-2xl font-black text-neo-black dark:text-neo-cyan">
                      {friend.totalGames || 0}
                    </p>
                    <p className="text-xs font-black uppercase tracking-wide text-current/70">
                      {t('stats.games')}
                    </p>
                  </div>
                  <div className="p-3 rounded-neo border-3 border-neo-black bg-neo-pink-muted dark:bg-neo-navy-light shadow-hard-sm text-center">
                    <p className="text-2xl font-black text-neo-black dark:text-neo-pink">
                      {friend.currentLevel || 1}
                    </p>
                    <p className="text-xs font-black uppercase tracking-wide text-current/70">
                      {t('stats.level')}
                    </p>
                  </div>
                </div>
              )}

              {/* Head to Head */}
              {!isBlockedUser && h2h && h2h.totalGames > 0 && (
                <div className="p-3 rounded-neo border-3 border-neo-black bg-neo-cream dark:bg-neo-navy-light shadow-hard-sm">
                  <p className="text-xs font-black mb-2 uppercase tracking-widest text-current/70 text-center">
                    {t('friends.headToHead.title')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xl font-black text-neo-lime-dark dark:text-neo-lime">
                        {h2h.myWins}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-current/70">
                        {t('friends.headToHead.wins')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-current/50">{h2h.draws}</p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-current/70">
                        {t('friends.headToHead.draws')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-neo-pink dark:text-neo-pink">
                        {h2h.theirWins}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-current/70">
                        {t('friends.headToHead.losses')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-center mt-2 font-bold text-current/60">
                    {h2h.totalGames} {t('friends.headToHead.totalGames')}
                  </p>
                </div>
              )}

              {/* Confirmation banner */}
              {confirmAction && (
                <div
                  className={cn(
                    'p-3 rounded-neo border-3 border-neo-black shadow-hard-sm text-center',
                    confirmAction === 'block' ? 'bg-neo-red/20' : 'bg-neo-pink/20'
                  )}
                >
                  <p className="text-sm font-black mb-2 uppercase tracking-tight text-neo-black dark:text-neo-white">
                    {confirmAction === 'unfriend'
                      ? t('friends.confirmRemove')
                      : t('friends.confirmBlock')}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setConfirmAction(null)}
                      className="px-4 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm font-black text-xs uppercase tracking-wide bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={confirmAction === 'block' ? handleBlock : handleUnfriend}
                      disabled={actionLoading}
                      className="px-4 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm font-black text-xs uppercase tracking-wide bg-neo-pink text-neo-white"
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
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-neo',
                      'border-3 border-neo-black shadow-hard',
                      'bg-neo-cyan text-neo-black font-black uppercase tracking-wide',
                      'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
                    )}
                  >
                    {actionLoading ? (
                      <Loader size="sm" />
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4 stroke-3" aria-hidden="true" />
                        {t('friends.unblock')}
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        onChallenge(friend);
                        onClose();
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 rounded-neo',
                        'border-3 border-neo-black shadow-hard',
                        'bg-neo-lime text-neo-black font-black uppercase tracking-wide',
                        'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
                      )}
                    >
                      <Target className="w-4 h-4 stroke-3" aria-hidden="true" />
                      {t('friends.challenge')}
                    </Button>
                    <Button
                      onClick={handleUnfriend}
                      disabled={actionLoading}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-neo',
                        'border-3 border-neo-black shadow-hard',
                        'bg-neo-pink text-neo-white font-black uppercase tracking-wide',
                        'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
                      )}
                      aria-label={t('friends.remove')}
                    >
                      {actionLoading ? (
                        <Loader size="sm" />
                      ) : (
                        <UserMinus className="w-4 h-4 stroke-3" aria-hidden="true" />
                      )}
                    </Button>
                    {onBlock && (
                      <Button
                        onClick={handleBlock}
                        disabled={actionLoading}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-neo',
                          'border-3 border-neo-black shadow-hard',
                          'bg-neo-red text-neo-white font-black uppercase tracking-wide',
                          'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
                        )}
                        aria-label={t('friends.block')}
                      >
                        <Ban className="w-4 h-4 stroke-3" aria-hidden="true" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
