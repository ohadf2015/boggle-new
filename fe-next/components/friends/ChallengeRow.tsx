'use client';

import React, { useState } from 'react';
import { Target, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveDisplayName } from '@/lib/displayName';
import type { FriendChallenge } from '@/utils/friends';

interface ChallengeRowProps {
  challenge: FriendChallenge;
  isDark: boolean;
  onAccept: (challengeId: string) => Promise<void>;
  onDecline: (challengeId: string) => Promise<void>;
}

/**
 * ChallengeRow - Challenge invitation with Accept/Decline actions
 */
export const ChallengeRow: React.FC<ChallengeRowProps> = ({
  challenge,
  isDark,
  onAccept,
  onDecline,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await onAccept(challenge.id);
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading('decline');
    try {
      await onDecline(challenge.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
        isDark ? 'bg-black/20' : 'bg-white/50'
      )}
    >
      <Avatar
        avatarImage={challenge.challengerAvatarImage}
        customAvatar={challenge.challengerCustomAvatar}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {resolveDisplayName(
            [challenge.challengerDisplayName, challenge.challengerUsername],
            t('friends.aPlayer', 'a player')
          )}
        </p>
        <p className={cn('text-xs truncate', isDark ? 'text-yellow-300' : 'text-yellow-600')}>
          {challenge.message || t('friends.challenges.defaultMessage')}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Accept */}
        <button
          type="button"
          data-testid={`accept-challenge-${challenge.id}`}
          onClick={handleAccept}
          disabled={loading !== null}
          className={cn(
            'w-8 h-8 flex items-center justify-center border-2 border-neo-black rounded-neo shadow-hard-sm transition-all',
            'bg-neo-lime text-neo-black hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5',
            loading !== null && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={t('friends.challenges.accept', 'Accept')}
        >
          {loading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        {/* Decline */}
        <button
          type="button"
          data-testid={`decline-challenge-${challenge.id}`}
          onClick={handleDecline}
          disabled={loading !== null}
          className={cn(
            'w-8 h-8 flex items-center justify-center border-2 border-neo-black rounded-neo shadow-hard-sm transition-all',
            'bg-neo-red text-white hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5',
            loading !== null && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={t('friends.challenges.decline', 'Decline')}
        >
          {loading === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        </button>
      </div>
      <Target className="w-5 h-5 text-neo-lime" />
    </div>
  );
};

export default ChallengeRow;
