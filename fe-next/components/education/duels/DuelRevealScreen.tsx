'use client';

/**
 * DuelRevealScreen — the payoff a duel never had.
 *
 * Before: a spring-animated trophy badge, silence, and coins credited off
 * screen. Blooket's Monster Brawl at least throws the word VICTORY across the
 * board with confetti. This goes further — the mascot's own champion / defeat
 * clip carries the result, the winner gets confetti + a fanfare, the coins fly
 * into a counter you can watch fill, and REMATCH carries a best-of-3 tally so
 * the loser has a reason to press it.
 *
 * Dark-only surface: `bg-neo-navy` is hardcoded, never
 * `bg-neo-cream dark:bg-neo-navy` — that pair flashes cream on a lazy mount
 * (recurring-pitfalls Class 5). The shell locks (`overflow-hidden`); one inner
 * column scrolls if a small phone runs out of room.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flame, Swords, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { type DuelSeries, type DuelSeriesStatus } from '@/lib/education/duelSeries';
import { DUEL_REVEAL_CLIPS, type DuelOutcome } from '@/lib/education/duelReveal';
import { cn } from '@/lib/utils';
import { DuelSeriesTally } from './DuelSeriesTally';
import { DuelCoinFlight } from './DuelCoinFlight';

export type { DuelOutcome };

export interface DuelRevealScreenProps {
  outcome: DuelOutcome;
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  xp: number;
  coins: number;
  /** Longest chain this student hit during the duel. */
  peakStreak: number;
  series: DuelSeries;
  seriesStatus: DuelSeriesStatus;
  onRematch?: () => void;
  /** True while the server has been asked for a rematch and has not answered. */
  rematchPending?: boolean;
  onBackToLobby?: () => void;
}

export function DuelRevealScreen({
  outcome,
  myScore,
  opponentScore,
  myName,
  opponentName,
  xp,
  coins,
  peakStreak,
  series,
  seriesStatus,
  onRematch,
  rematchPending = false,
  onBackToLobby,
}: DuelRevealScreenProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const [coinsLanded, setCoinsLanded] = useState(false);
  const firedRef = useRef(false);

  const clip = DUEL_REVEAL_CLIPS[outcome];
  const seriesDecided = seriesStatus !== 'open';

  // Fire the celebration exactly once — a re-render must not re-trumpet.
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // requiresGameActive:false — the sound gate is already off by the time the
    // duel completes, and this is the one moment that must be audible.
    if (outcome === 'win') {
      fireVictoryConfetti();
      playSound('epicVictory', { volume: 0.75, requiresGameActive: false });
      playSound('confettiRain', { volume: 0.4, requiresGameActive: false });
    } else if (outcome === 'loss') {
      playSound('defeatSting', { volume: 0.55, requiresGameActive: false });
    } else {
      playSound('mascotAww', { volume: 0.5, requiresGameActive: false });
    }
  }, [outcome, playSound]);

  return (
    <div
      data-testid="duel-reveal"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-neo-navy"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-3 overflow-y-auto px-4 py-4">
        {/* Result banner */}
        <div
          className={cn(
            'w-full max-w-md rounded-neo border-neo-thick px-4 py-2.5 text-center shadow-hard',
            clip.accent
          )}
        >
          <h2 className="font-neo-display text-3xl font-black uppercase italic tracking-tight text-neo-black">
            {t(clip.titleKey)}
          </h2>
        </div>

        {/* Mascot clip — the result, in character */}
        <div className="w-full max-w-[220px] overflow-hidden rounded-neo border-neo-thick bg-neo-navy shadow-hard">
          <video
            data-testid="duel-reveal-clip"
            src={clip.src}
            poster={clip.poster}
            autoPlay
            loop
            muted
            playsInline
            aria-label={t(clip.titleKey)}
            className="h-auto w-full"
          />
        </div>

        {/* Final head-to-head */}
        <div className="flex w-full max-w-md items-stretch gap-2">
          <div className="flex-1 rounded-neo border-neo bg-neo-cyan px-3 py-2 text-center shadow-hard-sm">
            <p className="truncate font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/70">
              {myName}
            </p>
            <p
              data-testid="duel-reveal-my-score"
              className="font-neo-display text-2xl font-black tabular-nums text-neo-black"
            >
              {myScore}
            </p>
          </div>
          <div className="flex items-center font-neo-display text-sm font-black uppercase text-neo-white/60">
            {t('education.duels.vs')}
          </div>
          <div className="flex-1 rounded-neo border-neo bg-neo-pink px-3 py-2 text-center shadow-hard-sm">
            <p className="truncate font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-white/80">
              {opponentName}
            </p>
            <p
              data-testid="duel-reveal-opponent-score"
              className="font-neo-display text-2xl font-black tabular-nums text-neo-white"
            >
              {opponentScore}
            </p>
          </div>
        </div>

        {/* Rewards: XP, best chain, and coins you watch arrive */}
        <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-neo border-neo bg-neo-purple px-3 py-1.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('education.duels.xpEarned', undefined, { count: xp })}
          </span>
          <span
            data-testid="duel-reveal-peak-streak"
            className="inline-flex items-center gap-1.5 rounded-neo border-neo bg-neo-orange px-3 py-1.5 font-neo-display text-sm font-black tabular-nums text-neo-black shadow-hard-sm"
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
            {t('education.duels.bestChain', undefined, { count: peakStreak })}
          </span>
          <DuelCoinFlight coins={coins} active onComplete={() => setCoinsLanded(true)} />
        </div>

        <DuelSeriesTally series={series} status={seriesStatus} className="mt-1" />
      </div>

      {/* Docked actions — always reachable, never scrolled away */}
      <div className="shrink-0 border-t-4 border-neo-black bg-neo-navy px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            data-testid="duel-back-btn"
            onClick={onBackToLobby}
            className="inline-flex items-center gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy px-4 py-3 font-neo-body text-sm font-black text-neo-cream shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
            {t('education.duels.backToLobby')}
          </button>

          {onRematch && (
            <button
              type="button"
              data-testid="duel-rematch-btn"
              data-pending={rematchPending ? 'true' : 'false'}
              onClick={onRematch}
              disabled={rematchPending}
              aria-busy={rematchPending || (!coinsLanded && coins > 0)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick bg-neo-lime px-4 py-3 font-neo-display text-base font-black uppercase italic tracking-tight text-neo-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed"
            >
              <Swords className="h-5 w-5" aria-hidden="true" />
              {rematchPending
                ? t('education.duels.rematchSent')
                : seriesDecided
                  ? t('education.duels.newSeries')
                  : t('education.duels.rematch')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
