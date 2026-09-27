'use client';

/**
 * DuelSwingBar — the head-to-head strip at the top of a real-time duel.
 *
 * Blooket's Battle Royale puts two portraits either side of a VS badge with a
 * segmented power bar under each. This does the same job but answers the one
 * question a kid actually asks mid-duel — "am I winning?" — in words: AHEAD BY
 * 15 / BEHIND BY 21 / LEVEL. The bar is the feeling, the verdict is the fact.
 *
 * Both scores are server numbers (`duel:word-accepted` for mine,
 * `duel:opponent-progress` for theirs); nothing is computed twice.
 *
 * Motion is a width spring only — the resting state paints immediately, no
 * fullscreen opacity tween (Class 5).
 */

import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface DuelSwingBarProps {
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  /** My live chain, from the server. */
  myStreak?: number;
  /** The rival's live chain, relayed with their progress. */
  opponentStreak?: number;
  className?: string;
}

type Swing = 'ahead' | 'behind' | 'level';

export function DuelSwingBar({
  myScore,
  opponentScore,
  myName,
  opponentName,
  myStreak = 0,
  opponentStreak = 0,
  className,
}: DuelSwingBarProps) {
  const { t } = useLanguage();

  const diff = myScore - opponentScore;
  const swing: Swing = diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'level';
  const gap = Math.abs(diff);

  const total = myScore + opponentScore;
  const minePercent = total === 0 ? 50 : Math.round((myScore / total) * 100);

  const verdictKey =
    swing === 'ahead'
      ? 'education.duels.aheadBy'
      : swing === 'behind'
        ? 'education.duels.behindBy'
        : 'education.duels.levelPegged';

  return (
    <div
      data-testid="duel-swing-bar"
      data-swing={swing}
      className={cn(
        'rounded-neo border-[3px] border-neo-cream/70 bg-neo-navy p-2 shadow-hard',
        className
      )}
    >
      {/* Names + live scores */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-neo-body text-xs font-black uppercase tracking-wide text-neo-cyan">
            {myName}
          </span>
          {myStreak >= 2 && (
            <img
              src="/mascot/streak-spark-nobg.webp"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
          )}
          <span
            data-testid="duel-swing-my-score"
            className="font-neo-display text-lg font-black leading-none tabular-nums text-neo-white"
          >
            {myScore}
          </span>
        </div>

        <span className="shrink-0 rounded-neo border-2 border-neo-black bg-neo-yellow px-1.5 font-neo-display text-[10px] font-black uppercase text-neo-black">
          {t('education.duels.vs')}
        </span>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span
            data-testid="duel-swing-opponent-score"
            className="font-neo-display text-lg font-black leading-none tabular-nums text-neo-white"
          >
            {opponentScore}
          </span>
          {opponentStreak >= 2 && (
            <img
              data-testid="duel-swing-opponent-fire"
              src="/mascot/streak-inferno-nobg.webp"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
          )}
          <span className="truncate font-neo-body text-xs font-black uppercase tracking-wide text-neo-pink">
            {opponentName}
          </span>
        </div>
      </div>

      {/* The swing itself */}
      <div className="flex h-4 overflow-hidden rounded-neo border-2 border-neo-black bg-neo-black">
        <m.div
          data-testid="duel-swing-mine"
          className="h-full bg-neo-cyan"
          style={{ width: `${minePercent}%` }}
          animate={{ width: `${minePercent}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        />
        <m.div
          data-testid="duel-swing-theirs"
          className="h-full bg-neo-pink"
          style={{ width: `${100 - minePercent}%` }}
          animate={{ width: `${100 - minePercent}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        />
      </div>

      {/* The verdict, in words */}
      <p
        data-testid="duel-swing-verdict"
        aria-live="polite"
        className={cn(
          'mt-1.5 text-center font-neo-display text-sm font-black uppercase tracking-tight',
          swing === 'ahead' && 'text-neo-lime',
          swing === 'behind' && 'text-neo-pink',
          swing === 'level' && 'text-neo-white/70'
        )}
      >
        {swing === 'level' ? t(verdictKey) : t(verdictKey, undefined, { points: gap })}
      </p>
    </div>
  );
}
