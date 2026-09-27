'use client';

/**
 * The single-player play screen — built on the Adventure run shell's pattern,
 * not the multiplayer PortraitLayout.
 *
 * Why its own layout: solo rode the MP shell (813 lines of room chrome — chat,
 * host, tournament, word-hunt, blast, twenty breakpoint variants), and a new
 * player's first game looked it. Measured on a 375x667 phone the board frame
 * was 330x240 — not square — because it sized itself from the WHOLE center
 * column (`100cqb - 200px`) while chrome ate 438px of the 667. Desktop showed a
 * chat age-gate in a game with no room; a landscape phone overflowed the board.
 *
 * What it shares with MP is the part that matters for feel: the same board
 * (GridComponent), word-forming strip, overlays, floating score, combo
 * announcement and haptics. What it drops is everything a solo round never has.
 *
 * Layout rules (see SOLO_SHELL_CSS):
 *  - phone: one column — bar, missions, BOARD (flex-1), word feed. The board
 *    slot is its own `container-type: size` and holds the traced-word strip on
 *    top, so the board is `min(slot width, slot height - strip)` — square, and
 *    it takes whatever is left.
 *  - short landscape (phones on their side): two lanes, HUD left, board right.
 *  - wide (>=900px, >=5/4): three lanes — stage | board | word feed — under
 *    one full-width bar, the Adventure TV layout.
 *  All media queries, never a JS breakpoint: CSS is right at first paint.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pause, Play, Timer, X } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import { WordFormingAreaConnected } from '@/components/game/in-game/components/WordFormingAreaConnected';
import { GameOverlays } from '@/components/game/in-game/components/GameOverlays';
import FloatingScoreAnimation from '@/components/game/FloatingScoreAnimation';
import { ComboMilestoneAnnouncement } from '@/components/game/ComboMilestoneAnnouncement';
import { vibrateWordSubmit } from '@/components/grid/hapticFeedback';
import { useHapticsEnabled, useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState, TranslationFn } from '@/components/game/in-game/types';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { SoloMission } from '@/lib/soloMissions';
import type { FoundWord } from './types';
import { SoloComboMeter } from './components/SoloComboMeter';
import { MissionChips } from './components/MissionChips';
import { SoloStartCard } from './components/SoloStartCard';

export interface SoloGameLayoutProps {
  grid: LetterGrid;
  language: Language;
  score: number;
  /** null = untimed (practice). */
  remainingTime: number | null;
  totalSeconds: number;
  isPaused: boolean;
  isGameOver: boolean;
  bots: ReadonlyArray<{ name: string; score: number }>;
  foundWords: FoundWord[];
  comboLevel: number;
  lastWordFoundTime: number;
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  earthquakeState: EarthquakeState;
  currentFeedback: WordFeedback | null;
  highlightedPath: Array<{ row: number; col: number }>;
  isDesktop: boolean;
  /** Round is dealt but the clock waits for the player's tap. */
  awaitingStart: boolean;
  onStart: () => void;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onPathSubmit?: (cells: Array<{ row: number; col: number; letter: string }>) => void;
  onExit: () => void;
  onPauseToggle?: () => void;
  gameStatsRef: RefObject<HTMLDivElement | null>;
  t: TranslationFn;
  soloStreak?: number;
  soloMultiplier?: number;
  soloPraiseKey?: string | null;
  soloMissions?: readonly SoloMission[];
  /** Coins badge / practice training bar — mode-specific extras. */
  soloChrome?: ReactNode;
  children?: ReactNode;
}

const SHELL = 'solo-shell';

/** Hand-written like Adventure's run/landscape.ts: a layout, not utility tweaks. */
const SOLO_SHELL_CSS = `
.${SHELL} [data-solo-slot="board"] .game-board-frame {
  --board-size: min(100cqw, calc(100cqh - var(--solo-word-h)), var(--solo-board-max));
  width: var(--board-size);
  height: var(--board-size);
  max-width: min(var(--board-size), 100%);
  max-height: min(var(--board-size), 100%);
}
@media (orientation: landscape) and (max-height: 540px) {
  .${SHELL} {
    max-width: none;
    display: grid;
    column-gap: 1rem;
    row-gap: 0.375rem;
    grid-template-columns: minmax(0, 1fr) min(calc(100dvh - 1.25rem), 58vw);
    grid-template-rows: auto auto auto minmax(0, 1fr);
    grid-template-areas: "bar board" "race board" "missions board" "words board";
    padding-top: max(0.5rem, env(safe-area-inset-top));
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
  .${SHELL} > [data-solo-slot] { margin-top: 0; }
  .${SHELL} > [data-solo-slot="bar"] { grid-area: bar; }
  .${SHELL} > [data-solo-slot="race"] { grid-area: race; }
  .${SHELL} > [data-solo-slot="missions"] { grid-area: missions; }
  .${SHELL} > [data-solo-slot="board"] { grid-area: board; }
  .${SHELL} > [data-solo-slot="words"] { grid-area: words; min-height: 0; overflow: hidden; }
  .${SHELL} > [data-solo-slot="words"] > ul { flex-wrap: wrap; overflow: hidden; align-content: flex-start; }
}
@media (min-width: 900px) and (min-aspect-ratio: 5/4) {
  .${SHELL} {
    max-width: 1600px;
    display: grid;
    column-gap: clamp(1rem, 2vw, 2.5rem);
    row-gap: 0.75rem;
    padding-inline: clamp(1rem, 2.4vw, 3rem);
    grid-template-columns: minmax(14rem, 0.9fr) minmax(0, 2fr) minmax(14rem, 0.9fr);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "bar bar bar" "race board words" "missions board words";
  }
  .${SHELL} > [data-solo-slot] { margin-top: 0; }
  .${SHELL} > [data-solo-slot="bar"] { grid-area: bar; }
  .${SHELL} > [data-solo-slot="race"] { grid-area: race; align-self: start; }
  .${SHELL} > [data-solo-slot="missions"] { grid-area: missions; align-self: start; }
  .${SHELL} > [data-solo-slot="missions"] [data-testid="mission-chips"] { flex-direction: column; }
  .${SHELL} > [data-solo-slot="board"] { grid-area: board; --solo-board-max: clamp(26rem, 42vw, 46rem); }
  .${SHELL} > [data-solo-slot="words"] { grid-area: words; min-height: 0; align-self: stretch; overflow: hidden; display: flex; flex-direction: column; }
  .${SHELL} > [data-solo-slot="words"] > ul { flex-direction: column; flex-wrap: nowrap; overflow-y: auto; overflow-x: hidden; height: auto; flex: 1 1 auto; }
  .${SHELL} > [data-solo-slot="words"] > ul > li { justify-content: space-between; }
}
/* TV / big monitor: the side lanes are read from the couch — scale them up. */
@media (min-width: 1700px) and (min-height: 900px) and (min-aspect-ratio: 5/4) {
  .${SHELL} > [data-solo-slot="bar"],
  .${SHELL} > [data-solo-slot="race"],
  .${SHELL} > [data-solo-slot="missions"] { zoom: 1.35; }
}`;

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const HUD_BUTTON =
  'grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-neo-black bg-neo-cream text-neo-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none';

export const SoloGameLayout = memo(function SoloGameLayout(props: SoloGameLayoutProps) {
  const {
    grid, language, score, remainingTime, totalSeconds, isPaused, isGameOver, bots,
    foundWords, comboLevel, fireRoundActive, fireRoundRemaining, earthquakeState, currentFeedback,
    highlightedPath, isDesktop, awaitingStart, onStart, onWordSubmit, onWordChange, onPathSubmit,
    onExit, onPauseToggle, gameStatsRef, t, soloStreak = 0, soloMultiplier = 1, soloPraiseKey = null,
    soloMissions, soloChrome, children,
  } = props;

  const hapticsEnabled = useHapticsEnabled();
  const reduceMotion = useShouldReduceMotion();
  const playing = !awaitingStart && !isPaused && !isGameOver;

  // Floating "+N" on every accepted word.
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [floatingFire, setFloatingFire] = useState(false);
  const prevFeedbackRef = useRef(currentFeedback);
  useEffect(() => {
    if (currentFeedback === prevFeedbackRef.current) return;
    prevFeedbackRef.current = currentFeedback;
    if (currentFeedback?.type !== 'accepted') return;
    if (currentFeedback.score) {
      setFloatingScore(currentFeedback.score);
      setFloatingFire(currentFeedback.fireRoundActive ?? false);
    }
    if (hapticsEnabled) vibrateWordSubmit(currentFeedback.word?.length ?? 0, comboLevel, fireRoundActive);
  }, [currentFeedback, comboLevel, fireRoundActive, hapticsEnabled]);
  const clearFloating = useCallback(() => { setFloatingScore(null); setFloatingFire(false); }, []);

  const rival = bots.length > 0 ? bots.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const leader = rival ? (score >= rival.score ? 'player' : 'bot') : 'player';
  // Tug-of-war bar: the player's share of the two scores, 50/50 at 0-0.
  const share = rival ? (score + rival.score === 0 ? 50 : Math.round((score / (score + rival.score)) * 100)) : 100;
  const urgent = remainingTime !== null && remainingTime <= 10 && playing;

  const validWords = useMemo(
    () => foundWords.filter((w) => w.isValid !== false).slice().reverse(),
    [foundWords],
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-neo-navy text-neo-cream select-none">
      {/* Stage light: darkest at the edges, pooled behind the board. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(56,189,248,0.10)_0%,rgba(10,16,40,0)_55%)]" />
      {urgent && (
        <div aria-hidden className={cn('pointer-events-none fixed inset-0 z-30 shadow-[inset_0_0_60px_rgba(255,50,50,0.55)]', !reduceMotion && 'animate-timer-vignette-ambient')} />
      )}

      {playing && <ComboMilestoneAnnouncement comboLevel={comboLevel} />}
      {playing && (
        <FloatingScoreAnimation score={floatingScore} isFireRound={floatingFire} onAnimationComplete={clearFloating} />
      )}
      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        isPlaying={playing}
        isDesktop={isDesktop}
        isTypingMode={false}
        isHelpOpen={false}
        onCloseHelp={() => {}}
        t={t}
      />

      <style>{SOLO_SHELL_CSS}</style>
      <div
        className={cn(
          SHELL,
          'relative z-10 mx-auto flex h-full w-full max-w-lg md:max-w-xl flex-col px-3 sm:px-4',
          'pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          '[--solo-board-max:560px] [--solo-word-h:3.25rem]',
        )}
      >
        {/* Bar: exit · race · clock · pause */}
        <div ref={gameStatsRef} data-solo-slot="bar" role="status" aria-label={t('singlePlayer.gameTime')} className="flex items-center gap-2 pe-12">
          <button type="button" onClick={onExit} aria-label={t('common.exit')} className={HUD_BUTTON}>
            <X className="h-5 w-5" strokeWidth={3} />
          </button>

          <div className="flex-1" />

          {remainingTime !== null && (
            <div
              data-testid="solo-timer"
              data-urgent={String(urgent)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border-[3px] border-neo-black px-2.5 font-neo-display text-lg font-bold tabular-nums text-neo-black shadow-[3px_3px_0_#000]',
                urgent ? cn('bg-neo-pink', !reduceMotion && 'animate-pulse') : 'bg-neo-yellow',
              )}
            >
              <Timer className="h-4 w-4" strokeWidth={3} aria-hidden />
              {/* Before Start the hook still holds its previous value; show the round length. */}
              <span dir="ltr">{formatClock(awaitingStart ? totalSeconds : remainingTime)}</span>
            </div>
          )}

          <div className="flex-1" />

          {onPauseToggle && (
            <button type="button" onClick={onPauseToggle} aria-label={t('common.pause')} className={HUD_BUTTON} disabled={awaitingStart || isGameOver}>
              {isPaused ? <Play className="h-5 w-5" strokeWidth={3} /> : <Pause className="h-5 w-5" strokeWidth={3} />}
            </button>
          )}
        </div>

        {/* The race: you vs the leading bot, as a tug-of-war bar. */}
        <div
          data-testid="solo-race"
          data-solo-slot="race"
          data-leader={leader}
          className="mt-2 flex items-center gap-2.5 rounded-xl border-[3px] border-neo-black bg-black/55 px-3 py-1.5 font-neo-display font-bold leading-none shadow-[3px_3px_0_#000]"
        >
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neo-lime">{t('common.you')}</span>
            <span dir="ltr" className="text-xl tabular-nums text-neo-cream">{score}</span>
          </span>
          {rival ? (
            <>
              <div aria-hidden className="flex h-2.5 min-w-8 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-pink">
                <div className="h-full bg-neo-lime transition-[width] duration-500 ease-out" style={{ width: `${share}%` }} />
              </div>
              <span className="flex min-w-0 shrink items-baseline gap-1.5">
                <span dir="ltr" className="text-xl tabular-nums text-neo-cream">{rival.score}</span>
                <span className="truncate text-[11px] uppercase tracking-wider text-neo-pink">{rival.name}</span>
              </span>
            </>
          ) : (
            <span className="ms-auto text-[11px] uppercase tracking-wider text-neo-cream/70">
              {t('singlePlayer.wordsFound')} <span dir="ltr" className="text-neo-cyan">{validWords.length}</span>
            </span>
          )}
        </div>

        {(soloChrome || (soloMissions && soloMissions.length > 0)) && (
          <div data-solo-slot="missions" className="mt-2 flex flex-col gap-1.5">
            {soloMissions && soloMissions.length > 0 ? <MissionChips missions={soloMissions} /> : null}
            {soloChrome}
          </div>
        )}

        {/* Board — sized to the slot's short side, so it is square and never spills. */}
        <div
          data-testid="solo-slot-board"
          data-solo-slot="board"
          className="relative mt-1 flex min-h-0 flex-1 flex-col items-center justify-center [container-type:size]"
        >
          {/* The traced word sits right on the board, where the eye already is. */}
          <div className="relative flex h-[var(--solo-word-h)] w-full shrink-0 items-center justify-center">
            <WordFormingAreaConnected isTypingMode={false} typedWord="" feedback={currentFeedback} />
            <div className="pointer-events-none absolute inset-x-0 -bottom-1 flex justify-center">
              <SoloComboMeter streak={soloStreak} multiplier={soloMultiplier} praiseKey={soloPraiseKey} />
            </div>
          </div>
          <div className="flex justify-center" style={{ width: 'min(100cqw, calc(100cqh - var(--solo-word-h)), var(--solo-board-max))' }}>
            <GridComponent
              grid={grid}
              interactive={playing}
              onWordSubmit={onWordSubmit}
              onPathSubmit={onPathSubmit}
              onWordChange={onWordChange}
              comboLevel={comboLevel}
              hideComboIndicator
              hideWordPreview
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
              highlightedPath={highlightedPath}
              language={language}
              effectsProfile="lean"
              submitFeedback={currentFeedback}
            />
          </div>
        </div>

        {/* Found words — newest first. A strip on phones, a feed column when wide. */}
        <div data-testid="solo-slot-words" data-solo-slot="words" className="mt-2 shrink-0">
          <div className="mb-1 flex items-center justify-between px-0.5 text-[11px] font-bold uppercase tracking-wider text-neo-cream/70">
            <span>{t('singlePlayer.wordsFound')}</span>
            <span dir="ltr" className="tabular-nums text-neo-cyan">{validWords.length}</span>
          </div>
          {validWords.length === 0 ? (
            <p className="flex h-9 items-center justify-center rounded-lg border-2 border-dashed border-neo-cream/25 text-xs font-semibold text-neo-cream/60">
              {t('singlePlayer.noWordsYet')}
            </p>
          ) : (
            <ul className="flex h-9 gap-1.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
              {validWords.map((w) => (
                <li
                  key={`${w.word}-${w.timestamp}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-neo-black bg-neo-cream px-2 py-1 text-sm font-black uppercase text-neo-black shadow-[2px_2px_0_#000]"
                >
                  <span>{w.word}</span>
                  <span dir="ltr" className="rounded bg-neo-lime px-1 text-[11px] font-black tabular-nums">+{w.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {children}
      </div>

      {awaitingStart && !isGameOver && (
        <SoloStartCard
          rivals={bots.map((b) => b.name)}
          seconds={remainingTime !== null ? totalSeconds : null}
          onStart={onStart}
          t={t}
        />
      )}
    </div>
  );
});

export default SoloGameLayout;
