'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Share2, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { getWithAuth } from '@/utils/authFetch';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { DailyBoardView } from '@/lib/daily/mergeDailyLeaderboard';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { buildFriendsToday } from './friendsToday';

const MAX_ROWS = 5;

/**
 * "Today with friends": the viewer and their friends on today's daily, ranked
 * among themselves, with the next friend to beat and a brag to share.
 * Hidden until the player has at least one friend.
 */
export function FriendsTodayCard({ className }: { className?: string }) {
  const { t, language } = useLanguage();
  const { friends } = useFriends();
  const [board, setBoard] = useState<DailyBoardView | null>(null);
  const date = getDailyChallengeDate();
  const hasFriends = friends.length > 0;

  useEffect(() => {
    if (!hasFriends) return;
    const ctrl = new AbortController();
    getWithAuth(`/api/daily/leaderboard?date=${date}&lang=all&limit=1&friends=1`, { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: DailyBoardView | null) => { if (b) setBoard(b); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [date, hasFriends]);

  const today = useMemo(() => (board ? buildFriendsToday(board.data, friends.length) : null), [board, friends.length]);
  if (!hasFriends || !today) return null;

  const playedCount = today.rows.length;
  const leading = today.youPlayed && today.yourRank === 1 && playedCount > 1;

  const share = async () => {
    const text = (leading ? t('friendSocial.today.shareLead') : t('friendSocial.today.shareRank'))
      .replace('{rank}', String(today.yourRank ?? ''))
      .replace('{count}', String(playedCount))
      .replace('{score}', String(today.rows.find((r) => r.isYou)?.total ?? 0));
    const result = await shareWithFallback({ text, url: `https://lexiclash.live/${language}/daily` });
    if (result === 'shared' || result === 'copied') trackGrowthEvent('share_completed', { surface: 'friends_today', method: result });
  };

  return (
    <section
      data-testid="friends-today"
      aria-labelledby="friends-today-title"
      className={cn('rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard', className)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="friends-today-title" className="flex items-center gap-1.5 font-neo-display text-base font-bold text-neo-cream">
          <Trophy aria-hidden className="h-4 w-4 text-neo-yellow" />
          {t('friendSocial.today.title')}
        </h2>
        {today.youPlayed && playedCount > 1 && (
          <button
            type="button"
            onClick={share}
            data-testid="friends-today-share"
            className="inline-flex h-9 items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-yellow px-3 font-neo-display text-xs font-bold uppercase text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none"
          >
            <Share2 aria-hidden className="h-4 w-4" />
            {t('friendSocial.today.share')}
          </button>
        )}
      </div>

      {playedCount > 0 && (
        <ol className="flex flex-col gap-1">
          {today.rows.slice(0, MAX_ROWS).map((r) => (
            <li
              key={r.key}
              data-you={r.isYou || undefined}
              className={cn(
                'flex items-center gap-2 rounded-neo border-2 px-2 py-1.5',
                r.isYou ? 'border-neo-cyan bg-neo-cyan/15' : 'border-neo-black bg-neo-navy',
              )}
            >
              <span className="w-6 text-center font-neo-display text-sm font-bold tabular-nums text-neo-white">
                {r.rank === 1 ? <Crown aria-label="1" className="mx-auto h-4 w-4 fill-neo-yellow text-neo-yellow" /> : r.rank}
              </span>
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-neo-black">
                <Avatar avatarImage={r.avatarImage ?? undefined} customAvatar={(r.customAvatar as CustomAvatarConfig | null) ?? undefined} userId={r.key} size="sm" className="h-full w-full" />
              </span>
              <span dir="auto" className={cn('min-w-0 flex-1 truncate text-sm font-bold', r.isYou ? 'text-neo-cyan' : 'text-neo-white')}>
                {r.isYou ? t('friendSocial.today.you') : r.name}
              </span>
              <span className="font-neo-display text-sm font-bold tabular-nums text-neo-cream">{r.total}</span>
            </li>
          ))}
        </ol>
      )}

      <p data-testid="friends-today-line" className="mt-2 text-sm font-bold text-neo-white/80">
        {!today.youPlayed
          ? today.toBeat
            ? t('friendSocial.today.beatTop').replace('{name}', today.toBeat.name).replace('{score}', String(today.toBeat.total))
            : t('friendSocial.today.beFirst')
          : leading
            ? t('friendSocial.today.leading')
            : today.toBeat
              ? t('friendSocial.today.chase').replace('{name}', today.toBeat.name).replace('{points}', String(today.toBeat.total - (today.rows.find((r) => r.isYou)?.total ?? 0)))
              : t('friendSocial.today.onlyYou')}
        {today.notPlayed > 0 && (
          <span className="block text-xs text-neo-white/60">
            {t('friendSocial.today.notPlayed').replace('{count}', String(today.notPlayed))}
          </span>
        )}
      </p>

      {!today.youPlayed && (
        <Link
          href={`/${language}/daily`}
          data-testid="friends-today-play"
          className="mt-2 flex h-11 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime font-neo-display text-sm font-bold uppercase text-neo-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {t('friendSocial.today.play')}
        </Link>
      )}
    </section>
  );
}

export default FriendsTodayCard;
