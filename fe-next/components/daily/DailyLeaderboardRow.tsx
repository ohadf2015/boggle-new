'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Crown, Eye, CalendarDays } from 'lucide-react';
import { getCountryFlag } from '@/shared/utils';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { DAILY_MODES } from '@/lib/dailyModes';
import type { Language } from '@/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import Avatar from '@/components/Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import { TierBadge } from '@/components/ui/TierBadge';
import { getDailyLeaderboardTier } from '@/lib/ranked/leaderboardTiers';
import type { RankMovement } from './leaderboardLive';
import { MODE_DOT } from './leaderboardRows';
import type { DailyParticipant, AllTimeParticipant, SeasonParticipant, T } from './leaderboardTypes';

/* The board card is always navy, so rows are dark-only (no light/dark pairs that
   could put cream text on a white row). Podium = gold / silver / bronze; the
   viewer's row is cyan with a hard cyan shadow, on or off the podium. */
const PODIUM: Record<number, { row: string; badge: string }> = {
  1: { row: 'bg-neo-yellow/15 border-neo-yellow', badge: 'bg-neo-yellow text-neo-black' },
  2: { row: 'bg-neo-white/10 border-neo-white/70', badge: 'bg-neo-white text-neo-black' },
  3: { row: 'bg-neo-orange/15 border-neo-orange', badge: 'bg-neo-orange text-neo-black' },
};

function rowTone(rank: number, isCurrentUser: boolean): string {
  if (isCurrentUser) return 'bg-neo-cyan/20 border-neo-cyan shadow-hard-cyan';
  return PODIUM[rank]?.row ?? 'bg-neo-navy border-neo-black/60';
}


/** Avatar seed: guests have no profile, so without one Avatar shows a skeleton forever. */
const avatarSeed = (p: { row_key?: string; player_id: string | null; guest_fingerprint: string | null; display_name: string }): string =>
  p.row_key ?? p.player_id ?? p.guest_fingerprint ?? p.display_name;

const LanguageChip: React.FC<{ language?: string | null }> = ({ language }) => {
  if (!language) return null;
  const cfg = LANGUAGE_CONFIG[language as Language];
  return (
    <span
      data-testid="row-language"
      data-language={language}
      title={cfg?.nativeName ?? language}
      aria-label={cfg?.name ?? language}
      className="inline-flex items-center justify-center text-xs sm:text-sm leading-none shrink-0"
    >
      {cfg?.flag ?? '🌐'}
    </span>
  );
};

/** ▲2 / ▼1 / NEW — what changed since the last refresh. */
const MovementChip: React.FC<{ movement?: RankMovement | null; t: T }> = ({ movement, t }) => {
  if (!movement) return null;
  if (movement.isNew) {
    return (
      <span data-testid="rank-movement" className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-neo-yellow text-neo-black border border-neo-black shrink-0">
        {t('wordHunt.leaderboard.newEntry')}
      </span>
    );
  }
  if (movement.delta === 0) return null;
  const up = movement.delta > 0;
  const count = Math.abs(movement.delta);
  const label = t(up ? 'wordHunt.leaderboard.movedUp' : 'wordHunt.leaderboard.movedDown').replace('{count}', String(count));
  return (
    <span
      data-testid="rank-movement"
      aria-label={label}
      title={label}
      className={`text-[10px] sm:text-xs font-black tabular-nums px-1.5 py-0.5 rounded-full border border-neo-black shrink-0 ${up ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black'}`}
    >
      {up ? '▲' : '▼'}{count}
    </span>
  );
};

interface ShellPerson {
  row_key?: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_image?: string | null;
  custom_avatar?: CustomAvatarConfig | null;
  country_code?: string | null;
}

/**
 * Rank badge, avatar, name (with profile tooltip) and YOU chip — the frame all
 * three row kinds share. `badges` sit after the name; `stats` under it; `trailing` at the end.
 */
function RowShell({
  person, rank, index, isCurrentUser, compact, t, showFlag = false, badges, stats, trailing, tooltip, testId,
}: {
  person: ShellPerson;
  rank: number;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: T;
  showFlag?: boolean;
  badges?: React.ReactNode;
  stats?: React.ReactNode;
  trailing?: React.ReactNode;
  tooltip?: { totalGames?: number; winRate?: number };
  testId?: string;
}) {
  const name = person.display_name || t('daily.aPlayer');
  const flag = showFlag ? getCountryFlag(person.country_code) : null;
  const podium = PODIUM[rank];
  return (
    <m.div
      data-testid={testId}
      data-viewer-row={isCurrentUser ? 'true' : undefined}
      data-rank={rank}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
      className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-neo border-2 ${rowTone(rank, isCurrentUser)} ${compact ? 'py-2' : ''}`}
    >
      <div
        className={`relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-neo border-2 border-neo-black flex items-center justify-center font-neo-display font-black text-sm sm:text-base tabular-nums ${
          podium ? `${podium.badge} shadow-hard-sm` : 'bg-neo-navy-elevated text-neo-white'
        }`}
      >
        {rank === 1 && <Crown aria-hidden className="absolute -top-2.5 w-4 h-4 text-neo-yellow fill-neo-yellow stroke-neo-black" />}
        {rank}
      </div>

      <div className="relative shrink-0">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 border-2 rounded-full overflow-hidden ${isCurrentUser ? 'border-neo-cyan' : 'border-neo-black'}`}>
          <Avatar
            avatarImage={person.avatar_image ?? undefined}
            customAvatar={person.custom_avatar ?? undefined}
            userId={avatarSeed(person)}
            size="lg"
            className="w-full h-full"
          />
        </div>
        {flag && (
          <div className="absolute -bottom-1 -end-1 text-sm leading-none" title={person.country_code || undefined}>
            {flag}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <PlayerProfileTooltip
            player={{
              id: person.player_id ?? undefined,
              username: name,
              avatarImage: person.avatar_image ?? undefined,
              customAvatar: person.custom_avatar,
              countryCode: person.country_code,
              ...tooltip,
            }}
            isCurrentUser={isCurrentUser}
            side="bottom"
          >
            <span className={`font-bold truncate text-sm sm:text-base ${isCurrentUser ? 'text-neo-cyan' : 'text-neo-white cursor-pointer hover:underline'}`}>
              {name}
            </span>
          </PlayerProfileTooltip>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black border border-neo-black px-2 py-0.5 rounded-full font-black shrink-0">
              {t('wordHunt.leaderboard.you')}
            </span>
          )}
          {badges}
        </div>
        {stats && <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5 flex-wrap">{stats}</div>}
      </div>

      {trailing}
    </m.div>
  );
}

/** One dot + points per played mode (combined board). Tower shows its real metres. */
function ModeBreakdown({ p, t }: { p: DailyParticipant; t: T }) {
  const played = p.played_modes ?? [];
  if (played.length < 2) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-[10px] sm:text-xs text-neo-white/60 font-medium tabular-nums">
      {DAILY_MODES.filter((mode) => played.includes(mode.id)).map((mode) => (
        <span key={mode.id} className="inline-flex items-center gap-1" title={t(mode.titleKey)}>
          <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${MODE_DOT[mode.id]}`} />
          {mode.id === 'word-tower' && p.tower_height_m != null ? `${Math.round(p.tower_height_m)}m` : p.by_mode?.[mode.id] ?? 0}
        </span>
      ))}
    </span>
  );
}

export const TodayParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: T;
  onViewWheelWords?: (participant: DailyParticipant) => void;
  onViewHuntWords?: (participant: DailyParticipant) => void;
  scope?: 'combined' | 'word-hunt' | 'word-wheel';
  /** Show the language the row was played in (cross-language board). */
  showLanguage?: boolean;
  /** Rank change since the previous refresh, if any. */
  movement?: RankMovement | null;
}>(({ participant: p, index, isCurrentUser, compact, t, onViewWheelWords, onViewHuntWords, scope = 'combined', showLanguage = false, movement }) => {
  const hasId = !!(p.player_id || p.guest_fingerprint);
  const seeWords =
    scope === 'word-wheel' && onViewWheelWords && hasId && !isCurrentUser
      ? { open: () => onViewWheelWords(p), label: t('wordWheel.viewWordsYouMissed') || t('wordWheel.viewSubmittedWords'), tone: 'bg-neo-purple text-neo-white' }
      : scope === 'word-hunt' && onViewHuntWords && hasId && !isCurrentUser && (p.words_discovered?.length ?? 0) > 0
        ? { open: () => onViewHuntWords(p), label: t('wordHunt.results.tapPlayerHint'), tone: 'bg-neo-cyan text-neo-black' }
        : null;
  const scoreText = (
    <>
      {p.score} <span className="text-xs font-bold opacity-70">{t('wordHunt.leaderboard.pts')}</span>
    </>
  );

  return (
    <RowShell
      person={p}
      rank={p.rank_position}
      index={index}
      isCurrentUser={isCurrentUser}
      compact={compact}
      t={t}
      badges={
        <>
          {showLanguage && <LanguageChip language={p.language} />}
          <MovementChip movement={movement} t={t} />
        </>
      }
      stats={
        (p.solved !== undefined || (p.played_modes?.length ?? 0) > 1) && (
          <>
            {p.solved !== undefined && (
              <span className={`font-bold ${p.solved ? 'text-neo-lime' : 'text-neo-pink'}`}>
                {p.solved
                  ? `✓ ${p.attempts_used}/10`
                  : p.attempts_used != null
                    ? `✗ ${p.attempts_used}/10`
                    : `✗ ${t('wordHunt.leaderboard.failed')}`}
              </span>
            )}
            <ModeBreakdown p={p} t={t} />
          </>
        )
      }
      trailing={
        p.score > 0 && (
          seeWords ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); seeWords.open(); }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm font-black tabular-nums cursor-pointer active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow] ${seeWords.tone}`}
              aria-label={seeWords.label}
              title={seeWords.label}
            >
              <span>{scoreText}</span>
              <Eye aria-hidden className="w-4 h-4" />
              <span className="sr-only">{t('wordHunt.leaderboard.seeWords')}</span>
            </button>
          ) : (
            <span className={`shrink-0 font-neo-display font-black tabular-nums text-base sm:text-lg ${isCurrentUser ? 'text-neo-cyan' : 'text-neo-cream'}`}>
              {scoreText}
            </span>
          )
        )
      }
    />
  );
});
TodayParticipantRow.displayName = 'TodayParticipantRow';

export const AllTimeParticipantRow = memo<{
  participant: AllTimeParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: T;
}>(({ participant: p, index, isCurrentUser, compact, t }) => (
  <RowShell
    person={p}
    rank={p.rank_position}
    index={index}
    isCurrentUser={isCurrentUser}
    compact={compact}
    t={t}
    showFlag
    tooltip={{
      totalGames: p.total_games,
      winRate: p.total_games > 0 ? Math.round((p.games_won / p.total_games) * 100) : undefined,
    }}
    badges={p.best_efficiency != null && (
      <TierBadge tier={getDailyLeaderboardTier(p.best_efficiency)} size="xs" animated={p.rank_position === 1} />
    )}
    stats={
      <>
        <span className="font-black text-neo-yellow tabular-nums">{p.total_efficiency_score} {t('wordHunt.leaderboard.pts')}</span>
        <span className="text-neo-white/40" aria-hidden>•</span>
        <span className="text-neo-white/70 font-medium">{p.games_won}/{p.total_games} {t('wordHunt.leaderboard.solved')}</span>
      </>
    }
    trailing={!compact && (
      <div className="hidden sm:flex flex-col items-end text-xs">
        <div className="text-neo-white/60">{t('wordHunt.leaderboard.best')}</div>
        <div className="font-bold text-neo-yellow tabular-nums">{p.best_efficiency}</div>
      </div>
    )}
  />
));
AllTimeParticipantRow.displayName = 'AllTimeParticipantRow';

export const SeasonParticipantRow = memo<{
  participant: SeasonParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: T;
  /** Accent colour of the season being viewed — tints the score. */
  accentColor?: string;
}>(({ participant: p, index, isCurrentUser, compact, t, accentColor }) => {
  const daysLabel = p.days_played === 1
    ? t('wordHunt.leaderboard.dayPlayed')
    : t('wordHunt.leaderboard.daysPlayed').replace('{count}', String(p.days_played));
  return (
    <RowShell
      testId="season-row"
      person={p}
      rank={p.rank_position}
      index={index}
      isCurrentUser={isCurrentUser}
      compact={compact}
      t={t}
      showFlag
      badges={p.languages.map((lang) => <LanguageChip key={lang} language={lang} />)}
      stats={
        <>
          <span className="font-black tabular-nums text-neo-yellow" style={accentColor ? { color: accentColor } : undefined}>
            {p.season_score} {t('wordHunt.leaderboard.seasonPts')}
          </span>
          <span className="text-neo-white/40" aria-hidden>•</span>
          <span className="inline-flex items-center gap-1 text-neo-white/70 font-medium">
            <CalendarDays aria-hidden className="w-3.5 h-3.5" />
            {daysLabel}
          </span>
        </>
      }
    />
  );
});
SeasonParticipantRow.displayName = 'SeasonParticipantRow';

export const SkeletonRow = memo<{ index: number }>(({ index }) => (
  <m.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
    className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-neo border-2 border-neo-black/60 bg-neo-navy"
  >
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-neo bg-neo-navy-elevated animate-pulse" />
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neo-navy-elevated animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-neo-navy-elevated rounded animate-pulse" />
      <div className="h-3 w-16 bg-neo-navy-elevated rounded animate-pulse" />
    </div>
  </m.div>
));
SkeletonRow.displayName = 'SkeletonRow';
