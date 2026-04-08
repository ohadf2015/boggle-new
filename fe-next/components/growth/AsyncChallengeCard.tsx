'use client';

/**
 * AsyncChallengeCard - Landing page card showing pending async challenges.
 * Shows up to 3 pending challenges with challenger info and Play Now CTA.
 * Falls back to "Challenge a Friend" when no pending challenges exist.
 * Neo-brutalist: border-neo-orange, shadow-hard, Swords icon.
 */

import React, { memo, useCallback } from 'react';
import { Swords, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAsyncChallenge } from '@/hooks/useAsyncChallenge';
import { cn } from '@/lib/utils';
import type { AsyncBoardChallenge } from '@/shared/types/growth';

const MAX_VISIBLE = 3;

function ChallengeRow({
  challenge,
  onPlay,
}: {
  challenge: AsyncBoardChallenge;
  onPlay: (id: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      data-testid={`challenge-row-${challenge.id}`}
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo',
        'bg-neo-white/5 border border-neo-white/10'
      )}
    >
      {/* Challenger avatar / initial */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full',
          'bg-neo-orange/20 border-2 border-neo-orange',
          'flex items-center justify-center',
          'font-neo-display font-bold text-sm text-neo-orange'
        )}
        aria-hidden="true"
      >
        {challenge.challengerName?.charAt(0)?.toUpperCase() ?? '?'}
      </div>

      {/* Challenger name + mode */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neo-white truncate">
          {challenge.challengerName ?? t('asyncChallenge.unknown')}
        </p>
        <p className="text-xs text-neo-white/50">
          {t(`asyncChallenge.mode.${challenge.gameMode}`)}
        </p>
      </div>

      {/* Play button */}
      <button
        data-testid={`play-challenge-${challenge.id}`}
        onClick={() => onPlay(challenge.id)}
        className={cn(
          'shrink-0 px-3 py-1.5 rounded-neo',
          'bg-neo-orange text-neo-navy font-bold text-xs',
          'border-neo shadow-hard-sm',
          'hover:shadow-hard-pressed active:translate-y-0.5'
        )}
        aria-label={t('asyncChallenge.playAriaLabel', { name: challenge.challengerName ?? '' })}
      >
        {t('asyncChallenge.playNow')}
      </button>
    </div>
  );
}

export const AsyncChallengeCard: React.FC = memo(function AsyncChallengeCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { challenges, pendingCount, loading } = useAsyncChallenge();
  const pendingChallenges = challenges.filter(c => c.status === 'pending' && c.challengedId !== undefined);

  const handlePlay = useCallback(
    (challengeId: string) => {
      router.push(`/challenge/${challengeId}`);
    },
    [router]
  );

  const handleChallengeFriend = useCallback(() => {
    router.push('/friends?action=challenge');
  }, [router]);

  if (loading) return null;

  const visible = pendingChallenges?.slice(0, MAX_VISIBLE) ?? [];
  const hasPending = visible.length > 0;

  return (
    <div
      data-testid="async-challenge-card"
      role="region"
      aria-label={t('asyncChallenge.ariaLabel')}
      className={cn(
        'border-neo border-neo-orange rounded-neo p-4',
        'bg-neo-navy shadow-hard-sm',
        'flex flex-col gap-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Swords className="w-6 h-6 text-neo-orange" aria-hidden="true" />
        <h3 className="font-neo-display text-lg text-neo-white">
          {hasPending
            ? t('asyncChallenge.yourTurn')
            : t('asyncChallenge.title')}
        </h3>
        {hasPending && (
          <span
            data-testid="pending-count"
            className={cn(
              'ms-auto px-2 py-0.5 rounded-full text-xs font-bold',
              'bg-neo-orange text-neo-navy'
            )}
          >
            {pendingChallenges!.length}
          </span>
        )}
      </div>

      {/* Challenge list or empty state */}
      {hasPending ? (
        <div className="flex flex-col gap-2">
          {visible.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              onPlay={handlePlay}
            />
          ))}
          {pendingChallenges!.length > MAX_VISIBLE && (
            <p className="text-xs text-neo-white/40 text-center">
              {t('asyncChallenge.moreCount', {
                count: String(pendingChallenges!.length - MAX_VISIBLE),
              })}
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-neo-white/70">
            {t('asyncChallenge.emptyDesc')}
          </p>
          <button
            data-testid="challenge-friend-btn"
            onClick={handleChallengeFriend}
            className={cn(
              'w-full py-2 rounded-neo font-bold',
              'bg-neo-orange text-neo-navy border-neo shadow-hard-sm',
              'hover:shadow-hard-pressed active:translate-y-0.5',
              'flex items-center justify-center gap-2'
            )}
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            {t('asyncChallenge.challengeFriend')}
          </button>
        </>
      )}
    </div>
  );
});

export default AsyncChallengeCard;
