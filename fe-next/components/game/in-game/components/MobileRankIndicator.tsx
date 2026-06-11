'use client';

import { AnimatePresence } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useOvertakeAlert } from '@/hooks/useOvertakeAlert';
import { selectClosestRivals } from '@/lib/leaderboard/selectClosestRivals';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface RankedEntry {
  username: string;
  score: number;
}

interface MobileRankIndicatorProps {
  leaderboard: RankedEntry[];
  currentUsername: string;
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
}

/**
 * Compact, always-visible (mobile, multiplayer) rank rail. Classic MP runs in
 * gameplayFocusMode which hides the full mobile leaderboard, leaving phone
 * players blind to their standing — this small pill restores "You're #N" plus a
 * transient "{name} passed you!" cue without re-cluttering the grid screen.
 *
 * Dynamic values (rank number, player name) are rendered as their own spans;
 * only static label fragments go through `t()` — the translator here takes no
 * interpolation params.
 */
export function MobileRankIndicator({
  leaderboard,
  currentUsername,
  t,
  dir = 'ltr',
}: MobileRankIndicatorProps) {
  const { myRank, alert } = useOvertakeAlert(leaderboard, currentUsername);

  // Only meaningful when I'm on a multiplayer board.
  if (myRank === 0 || leaderboard.length < 2) return null;

  const total = leaderboard.length;
  const isLeading = myRank === 1;

  // Closest player = the single nearest rival by score: the one I'm chasing, or my
  // nearest chaser when I lead. Reuses the pure, mode-agnostic standings selector
  // so the gap math lives in one place (shared with the desktop rivals panel).
  const closest =
    selectClosestRivals(
      leaderboard.map((e) => ({
        id: e.username,
        name: e.username,
        score: e.score,
        isMe: e.username === currentUsername,
      })),
      1,
    )?.rows.find((r) => !r.isMe) ?? null;
  const rivalGap = closest ? Math.abs(closest.deltaToMe) : 0;
  const rivalLabelKey =
    closest?.direction === 'ahead'
      ? 'multiplayer.rival.ahead'
      : closest?.direction === 'behind'
        ? 'multiplayer.rival.behind'
        : 'multiplayer.rival.tied';
  const RivalIcon =
    closest?.direction === 'ahead'
      ? ChevronUp
      : closest?.direction === 'behind'
        ? ChevronDown
        : Minus;
  // Neo contrast: bright cyan/yellow carry BLACK text; pink/purple carry white.
  const rivalChipColor =
    closest?.direction === 'ahead'
      ? 'bg-neo-cyan text-neo-black'
      : closest?.direction === 'behind'
        ? 'bg-neo-pink text-neo-white'
        : 'bg-neo-purple text-neo-white';

  return (
    <div className="block lg:hidden relative" dir={dir}>
      <div className="flex items-center justify-center gap-1.5">
        {/* Persistent place pill */}
        <div
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-neo border-neo px-3 py-1 font-neo-display',
            'shadow-hard-sm select-none',
            isLeading
              ? 'bg-neo-yellow text-neo-black border-neo-black'
              : 'bg-neo-pink text-neo-white border-neo-black',
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            {t('multiplayer.rank.you')}
          </span>
          <span className="text-base font-black tabular-nums leading-none">#{myRank}</span>
          <span className="text-[10px] font-bold opacity-70 tabular-nums">/ {total}</span>
          {isLeading && (
            <span className="text-[10px] font-black uppercase">{t('multiplayer.rank.leading')}</span>
          )}
        </div>

        {/* Closest player — who I'm chasing (or my nearest chaser when leading) */}
        {closest && (
          <div
            data-testid="mobile-rival-chip"
            className={cn(
              'flex items-center gap-1 rounded-neo border-neo border-neo-black px-2 py-1 font-neo-display',
              'shadow-hard-sm select-none max-w-[9rem]',
              rivalChipColor,
            )}
            role="status"
            aria-live="polite"
          >
            <RivalIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate text-xs font-black">{closest.name}</span>
            {closest.direction !== 'tie' && (
              <span className="text-xs font-black tabular-nums">{rivalGap}</span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
              {t(rivalLabelKey)}
            </span>
          </div>
        )}
      </div>

      {/* Transient overtake cue */}
      <AnimatePresence>
        {alert && (
          <AdaptiveMotion.div
            key="overtake"
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className={cn(
              'absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap',
              'flex items-center gap-1 rounded-neo border-neo border-neo-black bg-neo-red px-2.5 py-1',
              'text-neo-white shadow-hard-sm',
            )}
            role="alert"
          >
            <ChevronUp className="h-3 w-3 rotate-180 shrink-0" aria-hidden="true" />
            <span className="text-xs font-black">{alert.passedBy}</span>
            {alert.count > 1 && (
              <span className="text-[10px] font-bold opacity-80 tabular-nums">+{alert.count - 1}</span>
            )}
            <span className="text-[11px] font-bold">{t('multiplayer.overtake.passedYou')}</span>
          </AdaptiveMotion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
