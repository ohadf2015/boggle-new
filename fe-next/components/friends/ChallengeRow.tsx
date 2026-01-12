'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { FriendChallenge } from '@/utils/friends';

interface ChallengeRowProps {
  challenge: FriendChallenge;
  isDark: boolean;
  language: string;
}

/**
 * ChallengeRow - Challenge invitation item
 *
 * Features:
 * - Challenger avatar and username
 * - Challenge message or default text
 * - Click to join challenge
 * - Target icon indicator
 */
export const ChallengeRow: React.FC<ChallengeRowProps> = ({
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
      <Avatar
        avatarImage={challenge.challengerAvatarImage}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {challenge.challengerUsername}
        </p>
        <p className={cn('text-xs truncate', isDark ? 'text-yellow-300' : 'text-yellow-600')}>
          {challenge.message || (language === 'he' ? 'מזמין אותך לאתגר!' : 'challenges you!')}
        </p>
      </div>
      <Target className="w-5 h-5 text-neo-lime" />
    </a>
  );
};

export default ChallengeRow;
