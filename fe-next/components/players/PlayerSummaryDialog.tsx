'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import LevelBadge from '@/components/LevelBadge';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TitleBadge } from '@/components/progression/TitleBadge';
import { RankTierChip } from '@/components/seasons/RankTierChip';
import { StageStatTile } from '@/components/profile/showcase/StageStatTile';
import { getHeadlineStats } from '@/components/profile/showcase/profileShowcaseModel';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { useFriendStatus } from '@/components/friends/FriendStatusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trpc } from '@/lib/trpc';
import { playerProfileHref, summaryAccess, type PlayerSummarySeed } from './playerSummaryModel';

interface PlayerSummaryDialogProps {
  player: PlayerSummarySeed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Analytics surface, e.g. 'daily_leaderboard'. */
  surface: string;
}

/** Trade an id-free board's row key for the account id, once, while the card is open. */
function useResolvedId(player: PlayerSummarySeed, open: boolean, enabled: boolean) {
  const ctx = useFriendStatus();
  const resolve = ctx?.resolveBoardKey;
  const [resolved, setResolved] = useState<{ key: string; id: string | null } | null>(null);
  const key = player.boardKey ?? null;
  const done = resolved?.key === key;

  useEffect(() => {
    if (!open || !enabled || !key || !resolve || done) return;
    let live = true;
    resolve(key).then(
      (id) => { if (live) setResolved({ key, id }); },
      () => { if (live) setResolved({ key, id: null }); },
    );
    return () => { live = false; };
  }, [open, enabled, key, resolve, done]);

  return { id: done ? resolved!.id : null, resolving: enabled && !done };
}

/**
 * The card a board opens when you tap a player: who they are (avatar, name,
 * level, rank, title), a few headline stats, add-friend, and the way to their
 * full profile. Always navy (dark-only surface), sized for a phone.
 */
export function PlayerSummaryDialog({ player, open, onOpenChange, surface }: PlayerSummaryDialogProps) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const friendCtx = useFriendStatus();
  const access = summaryAccess(player, {
    isAuthenticated,
    canResolveBoardKey: !!(friendCtx?.isAuthenticated && friendCtx.boardDate),
  });

  const { id: resolvedId, resolving } = useResolvedId(player, open, access === 'boardKey');
  const id = player.id || resolvedId;

  const query = trpc.playerProfile.get.useQuery(
    { id: id ?? '' },
    { enabled: open && !!id, staleTime: 60_000, retry: false },
  );
  const profile = query.data;
  const loading = resolving || (!!id && query.isLoading);
  const failed = (access === 'boardKey' && !resolving && !resolvedId) || (!!id && query.isError);

  const name = player.name || profile?.displayName || profile?.username || t('daily.aPlayer');
  const flag = getCountryFlag(player.countryCode ?? profile?.countryCode ?? null);
  const stats = useMemo(
    () => (profile
      ? getHeadlineStats({
          longestWord: profile.longestWord,
          wins: profile.totalWins ?? Math.round(((profile.winRate || 0) * (profile.totalGames || 0)) / 100),
          games: profile.totalGames,
          winRate: profile.winRate,
        }, 3)
      : []),
    [profile],
  );
  const showHandle = !!profile?.username && profile.username !== name;

  const note =
    access === 'guest' ? t('playerSummary.guest')
      : access === 'signIn' ? t('playerSummary.signInToSee')
        : failed ? t('playerSummary.loadFailed')
          : profile && stats.length === 0 ? t('playerSummary.noStats')
            : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noDescription
        closeButtonLabel={t('common.close')}
        data-testid="player-summary"
        className="max-w-sm sm:max-w-sm lg:max-w-sm xl:max-w-sm bg-neo-navy dark:bg-neo-navy text-neo-white dark:text-neo-white"
      >
        <DialogHeader variant="cyan" className="text-start pe-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-3 border-neo-black bg-neo-navy shadow-hard-sm">
                <Avatar
                  avatarImage={player.avatarImage ?? undefined}
                  customAvatar={player.customAvatar ?? profile?.customAvatar ?? undefined}
                  userId={id ?? player.boardKey ?? player.name}
                  size="xl"
                  className="w-full h-full"
                />
              </div>
              {flag && <span className="absolute -bottom-1 -end-1 text-lg leading-none" aria-hidden>{flag}</span>}
            </div>
            <div className="min-w-0 flex flex-col gap-1">
              <DialogTitle className="text-xl sm:text-xl lg:text-xl normal-case truncate leading-tight">
                {name}
              </DialogTitle>
              {showHandle && (
                <p dir="ltr" className="text-xs font-bold text-neo-black/70 truncate text-start">@{profile!.username}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {profile && <LevelBadge level={profile.currentLevel || 1} size="sm" animate={false} />}
                {profile && <RankTierChip tier={scoreTier(profile.totalScore)} size="xs" />}
                <TitleBadge title={player.title} className="max-w-full" />
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          {loading && (
            <div data-testid="player-summary-loading" className="grid grid-cols-3 gap-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[68px] rounded-neo border-2 border-neo-black bg-neo-navy-light animate-pulse" />
              ))}
            </div>
          )}

          {!loading && stats.length > 0 && (
            <div data-testid="player-summary-stats" className={cn('grid gap-2', stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
              {stats.map((s) => <StageStatTile key={s.id} stat={s} />)}
            </div>
          )}

          {!loading && note && (
            <p data-testid="player-summary-note" className="text-sm font-bold text-neo-white/75 text-center">{note}</p>
          )}

          <div className="flex items-stretch gap-2">
            {id ? (
              <Link
                href={playerProfileHref(language, id)}
                data-testid="player-summary-profile-link"
                onClick={() => trackGrowthEvent('player_summary_profile_clicked', { surface })}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-neo',
                  'border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard',
                  'font-neo-display font-black uppercase tracking-wide text-sm',
                  'motion-safe:hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]',
                )}
              >
                {t('playerSummary.viewProfile')}
                <ArrowRight aria-hidden className="w-4 h-4 rtl:rotate-180" strokeWidth={3} />
              </Link>
            ) : loading ? (
              <span className="flex-1 inline-flex items-center justify-center h-12 rounded-neo border-3 border-neo-black/60 bg-neo-navy-light">
                <Loader2 aria-hidden className="w-5 h-5 animate-spin text-neo-white/70" />
              </span>
            ) : null}
            {id && (
              <FriendQuickAction userId={id} name={name} surface={surface} className="h-12 min-w-12 px-3" />
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default PlayerSummaryDialog;
