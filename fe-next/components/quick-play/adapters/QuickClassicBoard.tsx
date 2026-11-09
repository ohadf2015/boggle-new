'use client';

/**
 * Quick Play "classic" round rendered with the MULTIPLAYER classic board
 * (`InGameScreen`) instead of the legacy single-player layout — this is the
 * board players see in a live MP room, run here solo.
 *
 * Reuse, not rebuild: `useSinglePlayerCore` stays the headless game engine
 * (client-side trie validation, scoring, timer, round-end) — we only swap the
 * presentation. `socket=null` + `gameplayFocusMode` + a single-entry
 * leaderboard strip the room-only chrome (opponents, chat, leaderboard panel)
 * so a solo round reads clean, the same way AdventureHuntGame reuses the MP
 * word-hunt board offline.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { goldenMultiplierFor } from '@/shared/utils/goldenTile';
import { COACH_IDLE_HINT_SEC, COACH_ROUND_SECONDS, popFor, type RoundPop } from '@/lib/quickPlay/roundPops';
import { QuickCoachHint, QuickCoachIntro, QuickRoundPop } from './QuickRoundPops';
import { useSinglePlayerCore } from '@/components/singleplayer/game/hooks/useSinglePlayerCore';
import InGameScreen from '@/components/game/InGameScreen';
import type { HintsState } from '@/components/game/in-game/types';
import type { SinglePlayerResultsData } from '@/components/singleplayer/SinglePlayerView';
import { fromSinglePlayer } from './normalizeResult';
import { buildGhostRows } from '@/lib/quickPlay/ghostRivals';
import { GameShell, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { QuickClassicLeftRail, QuickClassicRightRail } from './QuickClassicRails';
import shellStyles from './quickClassicShell.module.css';
import { roundTarget, type QuickRoundConfig, type QuickRoundResult } from '../types';

interface QuickClassicBoardProps {
  config: QuickRoundConfig;
  onDone: (result: QuickRoundResult) => void;
  onQuit: () => void;
}

/** Hints are off in a quick solo round — disabled state, no request path. */
const DISABLED_HINTS: HintsState = {
  hint: null,
  hintType: null,
  hintsRemaining: 0,
  isLoading: false,
  error: null,
  isAvailable: false,
  isSinglePlayer: true,
  requestHint: () => undefined,
  clearHint: () => undefined,
};

export function QuickClassicBoard({ config, onDone, onQuit }: QuickClassicBoardProps) {
  const { t, dir } = useLanguage();

  // The board's own clock is the only one on a phone; on desktop the rail carries it.
  const inShell = useMediaQuery(SHELL_MEDIA);

  const coach = !!config.coach;
  const golden = config.goldenTile ?? null;
  // The engine's grid can change mid-round (earthquake); read the live one.
  const liveGridRef = useRef<string[][]>(config.grid);
  const [pop, setPop] = useState<RoundPop | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (popTimer.current) clearTimeout(popTimer.current); }, []);

  // Golden tile: a word traced through it scores double. The server picked the
  // cell from the seed and prices it into the submit ceiling.
  const wordMultiplier = useCallback(
    (word: string) => (golden ? goldenMultiplierFor(liveGridRef.current, word, golden) : 1),
    [golden]
  );

  const handleWordAccepted = useCallback(
    (e: { word: string; points: number; multiplier: number; validCount: number }) => {
      const next = popFor({ ...e, coach });
      if (e.multiplier > 1) {
        posthog.capture('golden_tile_hit', { mode: config.mode, points: e.points, word_length: e.word.length });
      }
      if (coach && e.validCount === 1) {
        posthog.capture('coach_first_word', { mode: config.mode, word_length: e.word.length, language: config.language });
      }
      if (next?.kind === 'rare') {
        posthog.capture('rare_word_pop', { mode: config.mode, tier: next.tier, word_length: e.word.length });
      }
      if (!next) return;
      setPop(next);
      if (popTimer.current) clearTimeout(popTimer.current);
      popTimer.current = setTimeout(() => setPop(null), next.kind === 'first' ? 2200 : 1600);
    },
    [coach, config.mode, config.language]
  );

  const core = useSinglePlayerCore({
    settings: {
      mode: 'challenge',
      difficulty: 'MEDIUM',
      language: config.language as never,
      grid: config.grid as never,
      // Coached first game: shorter, and the clock waits for the first word.
      timerSeconds: coach ? Math.min(COACH_ROUND_SECONDS, config.durationSec) : config.durationSec,
      bots: [], // quick play is bot-free by design
      minWordLength: 3,
      coach,
    },
    wordMultiplier,
    onWordAccepted: handleWordAccepted,
    // Arcade rounds are "your score this round", not a high-score race.
    targetHighScore: null,
    onGameEnd: (r: SinglePlayerResultsData) =>
      onDone(fromSinglePlayer({ score: r.playerScore, wordsFound: r.playerWords }, config)),
    onQuit,
    quitStaysOnPage: true,
    // InGameScreen below types and submits on its own keyboard handler.
    externalInput: true,
  });

  // The engine deals a timed board and then waits for a Start tap — a card this
  // MP board doesn't have, so the clock sat at 1:00 and the round never ended.
  // Quick Play is "tap a mode, you're playing": start the moment there's a board.
  const { grid: dealt, awaitingStart, handleStart } = core;
  useEffect(() => {
    if (dealt && awaitingStart) handleStart();
  }, [dealt, awaitingStart, handleStart]);

  // InGameScreen derives the shown score from the leaderboard entry matching
  // `username`, and every piece of race chrome (mobile rank rail, live
  // standings, closest-rivals gap) switches on at length > 1. So the ghosts go
  // in here as ordinary rows — no new UI, the MP board already knows how to run
  // a race. With no ghosts this collapses back to the single self-entry and the
  // room chrome stays hidden, exactly as before.
  const selfUsername = t('mp.rivals.you');
  const target = roundTarget(config);
  const progress =
    config.durationSec > 0
      ? 1 - core.timer.remainingTime / config.durationSec
      : 0;

  const leaderboard = useMemo(
    () => [
      { username: selfUsername, score: core.score, wordCount: core.foundWords.length },
      ...buildGhostRows(config.ghosts ?? [], {
        perfectScore: target.score,
        totalWords: target.words,
        progress,
        selfUsername,
      }),
    ],
    [
      selfUsername,
      core.score,
      core.foundWords.length,
      config.ghosts,
      target.score,
      target.words,
      progress,
    ]
  );

  useEffect(() => {
    if (core.grid) liveGridRef.current = core.grid as unknown as string[][];
  }, [core.grid]);

  const validCount = (core.foundWords as Array<{ isValid: boolean | null }>).filter((w) => w.isValid === true).length;

  // Coached round: a gentle hint if no word lands in the first ~10 seconds.
  // Resets whenever a word is found, and never shows once one has.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    setShowHint(false);
    if (!coach || !config.hintWord || !core.grid || validCount > 0) return;
    const id = setTimeout(() => setShowHint(true), COACH_IDLE_HINT_SEC * 1000);
    return () => clearTimeout(id);
  }, [coach, config.hintWord, core.grid, validCount]);
  const hintShownTracked = useRef(false);
  useEffect(() => {
    if (!showHint || hintShownTracked.current) return;
    hintShownTracked.current = true;
    posthog.capture('coach_hint_shown', { mode: config.mode, language: config.language });
  }, [showHint, config.mode, config.language]);

  const validWords = useMemo(
    () => (core.foundWords as Array<{ word: string; score: number; isValid: boolean | null }>).filter((w) => w.isValid !== false),
    [core.foundWords]
  );

  const gameActive =
    Boolean(core.grid) && !core.awaitingStart && !core.isPaused && !core.isGameOver && core.timer.remainingTime > 0;

  // Hold until the board resolves — InGameScreen is built around a real grid.
  if (!core.grid) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-neo-navy">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-neo-cozy/30 border-t-neo-cozy" aria-label={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-neo-navy">
      <GameShell
        mode="quick-classic"
        accent="cyan"
        className={shellStyles.stage}
        left={
          <QuickClassicLeftRail
            t={t}
            remaining={core.timer.remainingTime}
            total={config.durationSec}
            score={core.score}
            validWords={validWords}
            leaderboard={leaderboard}
            selfUsername={selfUsername}
          />
        }
        right={<QuickClassicRightRail t={t} validWords={validWords} />}
      >
      <InGameScreen
        inDesktopShell={inShell}
        username={selfUsername}
        gameCode="QUICK"
        isPlaying
        gameplayFocusMode
        t={t}
        dir={dir}
        socket={null}
        // No server behind this board — useSinglePlayerCore (via onWordSubmit)
        // is the engine, so the client commits words itself.
        clientAuthoritative
        letterGrid={core.grid as never}
        remainingTime={core.timer.remainingTime}
        gameActive={gameActive}
        gameLanguage={config.language as never}
        minWordLength={3}
        comboLevel={core.combo.comboLevelRef?.current ?? 0}
        comboLevelRef={core.combo.comboLevelRef}
        foundWords={core.foundWords as never}
        leaderboard={leaderboard as never}
        // null hides the MP "words remaining" progress card (WordsRemaining):
        // it's room chrome that overflows the bounded quick-play stage and its
        // {count} label is unfilled solo — quick-play shows its own results.
        totalBoardWords={null}
        fireRoundActive={core.fireRoundActive}
        fireRoundRemaining={core.fireRoundRemaining}
        earthquakeState={core.earthquakeState}
        hints={DISABLED_HINTS}
        gameMode="classic"
        onWordSubmit={core.handleWordSubmit}
        onExitRoom={onQuit}
        soloGoldenLetters={golden ? [golden] : undefined}
      />
      </GameShell>
      {coach && validCount === 0 && !showHint && <QuickCoachIntro t={t} />}
      {showHint && config.hintWord && validCount === 0 && <QuickCoachHint word={config.hintWord} t={t} />}
      <QuickRoundPop pop={pop} t={t} />
    </div>
  );
}

export default QuickClassicBoard;
