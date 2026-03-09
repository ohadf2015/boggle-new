'use client';

import { useState, useCallback, useEffect } from 'react';
import { Target, Circle, UserMinus } from 'lucide-react';
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
  isDark: boolean;
  t: (key: string) => string;
}

export function FriendDetailDialog({
  friend,
  onClose,
  onChallenge,
  onUnfriend,
  isDark,
  t,
}: FriendDetailDialogProps): React.JSX.Element {
  const [actionLoading, setActionLoading] = useState(false);
  const [h2h, setH2H] = useState<HeadToHeadRecord | null>(null);

  useEffect(() => {
    if (friend?.odUserId) {
      getHeadToHead(friend.odUserId).then(setH2H);
    } else {
      setH2H(null);
    }
  }, [friend?.odUserId]);

  const handleUnfriend = useCallback(async () => {
    if (!friend) return;
    setActionLoading(true);
    await onUnfriend(friend.odUserId);
    setActionLoading(false);
    onClose();
  }, [friend, onUnfriend, onClose]);

  return (
    <Dialog open={!!friend} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        className={cn('max-w-sm', isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900')}
      >
        {friend && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar avatarImage={friend.avatarImage} size="lg" />
                <div>
                  <DialogTitle className="text-lg">
                    {friend.displayName || friend.username}
                  </DialogTitle>
                  <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    @{friend.username}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Online status */}
              <div className="flex items-center gap-2">
                <Circle
                  className={cn('w-3 h-3', friend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400')}
                />
                <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {friend.isOnline ? t('common.online') : t('common.offline')}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(
                  'p-3 rounded-neo border-2 text-center',
                  isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                )}>
                  <p className={cn('text-xl font-black', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                    {friend.totalGames || 0}
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
                    {friend.currentLevel || 1}
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {t('stats.level')}
                  </p>
                </div>
              </div>

              {/* Head to Head */}
              {h2h && h2h.totalGames > 0 && (
                <div className={cn(
                  'p-3 rounded-neo border-2',
                  isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
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
                      <p className={cn('text-lg font-black', isDark ? 'text-gray-400' : 'text-gray-400')}>{h2h.draws}</p>
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

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => { onChallenge(friend); onClose(); }}
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
                  onClick={handleUnfriend}
                  disabled={actionLoading}
                  variant="outline"
                  className={cn(
                    'flex items-center gap-2 py-2.5 rounded-neo border-2',
                    isDark ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-red-300 text-red-600 hover:bg-red-50'
                  )}
                >
                  {actionLoading ? (
                    <Loader size="sm" />
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
  );
}
