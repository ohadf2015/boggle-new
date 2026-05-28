'use client';

/**
 * Friend Challenge — Async Landing
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md §4.7
 *
 * Single page for both sides of an async friend challenge. Renders meta
 * (challenger, target score, mode, duration) + status-aware CTAs.
 *
 * NOTE — v1 scope: the actual game surface ('play' sub-route) is deferred.
 * Accept CTA flips status to 'accepted' and routes the friend to the standard
 * solo game; result is submitted via a follow-up Phase 3.5 wrapper.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Target, Check, X, Loader2, Trophy, Frown, Equal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { neoErrorToast, neoSuccessToast } from '@/components/NeoToast';

interface ChallengeView {
  id: string;
  status:
    | 'draft'
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'declined'
    | 'expired'
    | 'expired_draft'
    | 'expired_unfinished';
  gameMode: string;
  language: string;
  durationSeconds: number;
  challengerId: string;
  challengerName: string;
  challengerAvatar: string | null;
  challengerScore: number | null;
  challengedId: string;
  challengedName: string;
  challengedAvatar: string | null;
  challengedScore: number | null;
  winnerUserId: string | null;
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

interface Props {
  locale: string;
  challenge: ChallengeView;
  viewerIsChallenger: boolean;
}

async function putPhase(id: string, phase: 'accept' | 'decline' | 'challenged', body?: unknown) {
  const res = await fetch(`/api/growth/async-challenge?id=${id}&phase=${phase}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export default function FriendChallengeLandingClient({ locale, challenge, viewerIsChallenger }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);

  const opponent = viewerIsChallenger
    ? { name: challenge.challengedName, avatar: challenge.challengedAvatar }
    : { name: challenge.challengerName, avatar: challenge.challengerAvatar };

  const onAccept = useCallback(async () => {
    setActing('accept');
    const res = await putPhase(challenge.id, 'accept');
    setActing(null);
    if (!res.ok) {
      neoErrorToast(t('friends.challenges.acceptFailed'));
      return;
    }
    // Stash config for SP to read on next render
    try {
      sessionStorage.setItem(
        'pendingFriendChallenge',
        JSON.stringify({
          id: challenge.id,
          gameMode: challenge.gameMode,
          language: challenge.language,
          durationSeconds: challenge.durationSeconds,
          targetScore: challenge.challengerScore,
        }),
      );
    } catch {
      // ignore storage quota
    }
    neoSuccessToast(t('friends.challenges.accepted'));
    router.push(`/${locale}/?friendChallenge=${challenge.id}`);
  }, [challenge, locale, router, t]);

  const onDecline = useCallback(async () => {
    setActing('decline');
    const res = await putPhase(challenge.id, 'decline');
    setActing(null);
    if (!res.ok) {
      neoErrorToast(t('friends.challenges.declineFailed'));
      return;
    }
    neoSuccessToast(t('friends.challenges.declined'));
    router.push(`/${locale}/friends`);
  }, [challenge.id, locale, router, t]);

  const status = challenge.status;
  const isCompleted = status === 'completed';
  const winnerIsViewer = isCompleted && challenge.winnerUserId
    ? (viewerIsChallenger ? challenge.winnerUserId === challenge.challengerId : challenge.winnerUserId === challenge.challengedId)
    : null;
  const isTie = isCompleted && challenge.winnerUserId === null;
  const myScore = viewerIsChallenger ? challenge.challengerScore : challenge.challengedScore;
  const theirScore = viewerIsChallenger ? challenge.challengedScore : challenge.challengerScore;

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white p-4 flex items-center justify-center">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className={cn(
          'max-w-md w-full',
          'border-neo-thick border-neo-cyan rounded-neo p-6',
          'bg-neo-navy-light shadow-hard-lg',
          'flex flex-col gap-5',
        )}
      >
        <header className="flex items-center gap-3">
          <Target className="w-7 h-7 text-neo-cyan" aria-hidden="true" />
          <h1 className="font-neo-display text-2xl">
            {viewerIsChallenger
              ? t('friends.challenges.title.youSent')
              : t('friends.challenges.title.youReceived')}
          </h1>
        </header>

        <div className="flex items-center gap-3">
          <Avatar avatarImage={opponent.avatar ?? undefined} customAvatar={undefined} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{opponent.name}</p>
            <p className="text-xs text-neo-white">
              {t(`asyncChallenge.mode.${challenge.gameMode}`, challenge.gameMode)} · {challenge.durationSeconds}s
            </p>
          </div>
        </div>

        {challenge.message && (
          <blockquote className="italic text-sm text-neo-white border-l-4 border-neo-cyan/40 ps-3">
            &ldquo;{challenge.message}&rdquo;
          </blockquote>
        )}

        {/* Score / status block */}
        {status === 'pending' && !viewerIsChallenger && (
          <div className="text-center py-4">
            <p className="text-xs uppercase tracking-wider text-neo-white">
              {t('friends.challenges.targetScoreLabel')}
            </p>
            <p className="font-neo-display text-5xl text-neo-yellow mt-1">
              {challenge.challengerScore ?? '—'}
            </p>
            <p className="text-sm text-neo-white mt-2">
              {t('friends.challenges.targetScore', { score: String(challenge.challengerScore ?? 0) })}
            </p>
          </div>
        )}

        {status === 'pending' && viewerIsChallenger && (
          <div className="text-center py-4">
            <p className="text-sm text-neo-white">
              {t('friends.challenges.waitingForFriend', { name: opponent.name })}
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            {isTie ? (
              <Equal className="w-10 h-10 text-neo-cyan" aria-hidden="true" />
            ) : winnerIsViewer ? (
              <Trophy className="w-10 h-10 text-neo-yellow" aria-hidden="true" />
            ) : (
              <Frown className="w-10 h-10 text-neo-pink" aria-hidden="true" />
            )}
            <p className="font-neo-display text-2xl">
              {isTie
                ? t('friends.challenges.result.tie', { mine: String(myScore ?? 0), theirs: String(theirScore ?? 0) })
                : winnerIsViewer
                ? t('friends.challenges.result.win', { mine: String(myScore ?? 0), theirs: String(theirScore ?? 0) })
                : t('friends.challenges.result.loss', { mine: String(myScore ?? 0), theirs: String(theirScore ?? 0) })}
            </p>
            <div className="flex gap-4 mt-2 text-sm text-neo-white">
              <span>{t('friends.challenges.yourScore')}: <b className="text-neo-white">{myScore ?? 0}</b></span>
              <span>{t('friends.challenges.theirScore')}: <b className="text-neo-white">{theirScore ?? 0}</b></span>
            </div>
          </div>
        )}

        {(status === 'declined' || status === 'expired' || status === 'expired_unfinished') && (
          <div className="text-center py-4 text-sm text-neo-white">
            {status === 'declined' && t('friends.challenges.declinedNotice')}
            {status === 'expired' && t('friends.challenges.expiredNotice')}
            {status === 'expired_unfinished' && t('friends.challenges.expiredUnfinishedNotice')}
          </div>
        )}

        {/* CTAs */}
        {status === 'pending' && !viewerIsChallenger && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDecline}
              disabled={acting !== null}
              className={cn(
                'flex-1 py-3 rounded-neo border-neo-thick border-neo-black shadow-hard',
                'bg-neo-white text-neo-navy font-bold uppercase tracking-wide',
                'hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-150 disabled:opacity-60',
                'flex items-center justify-center gap-2',
              )}
            >
              {acting === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {t('friends.challenges.decline')}
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={acting !== null}
              className={cn(
                'flex-[2] py-3 rounded-neo border-neo-thick border-neo-black shadow-hard',
                'bg-neo-lime text-neo-black font-bold uppercase tracking-wide',
                'hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-150 disabled:opacity-60',
                'flex items-center justify-center gap-2',
              )}
            >
              {acting === 'accept' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {t('friends.challenges.acceptAndPlay')}
            </button>
          </div>
        )}

        {status === 'accepted' && !viewerIsChallenger && (
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem(
                  'pendingFriendChallenge',
                  JSON.stringify({
                    id: challenge.id,
                    gameMode: challenge.gameMode,
                    language: challenge.language,
                    durationSeconds: challenge.durationSeconds,
                    targetScore: challenge.challengerScore,
                  }),
                );
              } catch {
                /* ignore */
              }
              router.push(`/${locale}/?friendChallenge=${challenge.id}`);
            }}
            className={cn(
              'w-full py-3 rounded-neo border-neo-thick border-neo-black shadow-hard',
              'bg-neo-lime text-neo-black font-bold uppercase tracking-wide',
              'hover:shadow-hard-lg active:shadow-hard-pressed transition-all',
            )}
          >
            {t('friends.challenges.playNow')}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push(`/${locale}/friends`)}
          className="text-sm text-neo-white underline self-center"
        >
          {t('friends.backToFriends')}
        </button>
      </m.div>
    </div>
  );
}
