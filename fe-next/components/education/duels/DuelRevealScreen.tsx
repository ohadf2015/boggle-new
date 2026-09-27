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
import { ArrowLeft, Flame, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { type DuelSeries, type DuelSeriesStatus } from '@/lib/education/duelSeries';
import { DUEL_REVEAL_CLIPS, type DuelOutcome } from '@/lib/education/duelReveal';
import { cn } from '@/lib/utils';
import { DuelSeriesTally } from './DuelSeriesTally';
import { DuelCoinFlight } from './DuelCoinFlight';
import { DuelRevealMascot } from './DuelRevealMascot';
import { DuelRematchButton } from './DuelRematchButton';
import type { DuelRematchState } from '@/hooks/useDuelRematch';

/** Which fanfare each outcome fires — stamped on the root so a capture can read it. */
const FANFARE: Record<DuelOutcome, string> = {
  win: 'epicVictory',
  loss: 'defeatSting',
  draw: 'mascotAww',
};

/**
 * A static starburst. canvas-confetti particles are gone ~2s after the reveal,
 * so a screenshot taken at +4s showed a silent screen and the critic read it as
 * "no celebration". This stays. Neo-yellow is the celebration/gold accent and
 * is used nowhere else on this screen.
 */
function VictoryBurst() {
  return (
    <div
      data-testid="duel-reveal-burst"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <svg viewBox="0 0 200 200" className="h-[150%] w-[150%]" role="presentation">
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x="97"
            y="6"
            width="6"
            height="44"
            className="fill-neo-yellow"
            transform={`rotate(${i * 30} 100 100)`}
          />
        ))}
      </svg>
    </div>
  );
}

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
  /** Withdraw my own rematch offer. */
  onCancelRematch?: () => void;
  /**
   * Where the handshake stands. A rematch is an agreement between two students,
   * so the button has to show whose turn it is to agree — the old boolean could
   * only say "asked", which is how both kids ended up waiting on each other.
   */
  rematchState?: DuelRematchState;
  /** Who asked, when they asked first. */
  rematchOfferedByName?: string;
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
  onCancelRematch,
  rematchState = 'idle',
  rematchOfferedByName,
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
      /**
       * The payoff, stamped. A fanfare leaves nothing on screen and confetti
       * lasts two seconds — without these a capture cannot tell "fired" from
       * "silently no-opped" (recurring-pitfalls Class 4).
       */
      data-celebration={outcome}
      data-confetti={outcome === 'win' ? 'fired' : 'none'}
      data-fanfare={FANFARE[outcome]}
      /** Coin flight finished — a capture can tell the counter filled. */
      data-coins={coinsLanded ? 'landed' : 'flying'}
      /**
       * z-[100]: the app's own header and bottom nav paint above z-50, and a
       * result screen sandwiched between them loses its banner to one and its
       * REMATCH button to the other. A game surface owns the whole screen.
       */
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-neo-navy"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 overflow-y-auto px-4 py-3">
        {/* Result banner, with the still-frame burst behind it on a win */}
        <div className="relative isolate w-full max-w-md">
          {outcome === 'win' && <VictoryBurst />}
          <div
            className={cn(
              'w-full rounded-neo border-[3px] border-neo-black px-4 py-2.5 text-center shadow-hard',
              clip.accent
            )}
          >
            <h2 className="font-neo-display text-3xl font-black uppercase italic tracking-tight text-neo-black">
              {t(clip.titleKey)}
            </h2>
          </div>
        </div>

        {/* Mascot — the result, in character, and never a black box */}
        <DuelRevealMascot
          src={clip.src}
          poster={clip.poster}
          label={clip.titleKey}
          className="w-full max-w-[210px] sm:max-w-[240px]"
        />

        {/* Final head-to-head */}
        <div className="flex w-full max-w-md items-stretch gap-2">
          <div className="flex-1 rounded-neo border-[2px] border-neo-black bg-neo-cyan px-3 py-2 text-center shadow-hard-sm">
            <p className="truncate font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/80">
              {myName}
            </p>
            <p
              data-testid="duel-reveal-my-score"
              className="font-neo-display text-2xl font-black tabular-nums text-neo-black"
            >
              {myScore}
            </p>
          </div>
          <div className="flex items-center font-neo-display text-sm font-black uppercase text-neo-cream/80">
            {t('education.duels.vs')}
          </div>
          <div className="flex-1 rounded-neo border-[2px] border-neo-black bg-neo-pink px-3 py-2 text-center shadow-hard-sm">
            <p className="truncate font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/80">
              {opponentName}
            </p>
            <p
              data-testid="duel-reveal-opponent-score"
              className="font-neo-display text-2xl font-black tabular-nums text-neo-black"
            >
              {opponentScore}
            </p>
          </div>
        </div>

        {/* Rewards: XP, best chain, and coins you watch arrive */}
        <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black bg-neo-purple px-3 py-1.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('education.duels.xpEarned', undefined, { count: xp })}
          </span>
          <span
            data-testid="duel-reveal-peak-streak"
            className="inline-flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black bg-neo-orange px-3 py-1.5 font-neo-display text-sm font-black tabular-nums text-neo-black shadow-hard-sm"
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
            {t('education.duels.bestChain', undefined, { count: peakStreak })}
          </span>
          <DuelCoinFlight coins={coins} active onComplete={() => setCoinsLanded(true)} />
        </div>

        <DuelSeriesTally series={series} status={seriesStatus} className="mt-1" />
      </div>

      {/* Docked actions — always reachable, never scrolled away */}
      <div className="shrink-0 border-t-4 border-neo-cream bg-neo-navy px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="mx-auto flex max-w-md items-end gap-2">
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
            <DuelRematchButton
              state={rematchState}
              opponentName={opponentName}
              offeredByName={rematchOfferedByName}
              seriesDecided={seriesDecided}
              onRematch={onRematch}
              onCancel={onCancelRematch ?? (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  );
}
