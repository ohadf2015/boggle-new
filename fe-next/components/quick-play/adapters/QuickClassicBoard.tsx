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
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSinglePlayerCore } from '@/components/singleplayer/game/hooks/useSinglePlayerCore';
import InGameScreen from '@/components/game/InGameScreen';
import type { HintsState } from '@/components/game/in-game/types';
import type { SinglePlayerResultsData } from '@/components/singleplayer/SinglePlayerView';
import { fromSinglePlayer } from './normalizeResult';
import { buildGhostRows } from '@/lib/quickPlay/ghostRivals';
import type { QuickRoundConfig, QuickRoundResult } from '../types';

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

  const core = useSinglePlayerCore({
    settings: {
      mode: 'challenge',
      difficulty: 'MEDIUM',
      language: config.language as never,
      grid: config.grid as never,
      timerSeconds: config.durationSec,
      bots: [], // quick play is bot-free by design
      minWordLength: 3,
    },
    // Arcade rounds are "your score this round", not a high-score race.
    targetHighScore: null,
    onGameEnd: (r: SinglePlayerResultsData) =>
      onDone(fromSinglePlayer({ score: r.playerScore, wordsFound: r.playerWords }, config)),
    onQuit,
    quitStaysOnPage: true,
  });

  // InGameScreen derives the shown score from the leaderboard entry matching
  // `username`, and every piece of race chrome (mobile rank rail, live
  // standings, closest-rivals gap) switches on at length > 1. So the ghosts go
  // in here as ordinary rows — no new UI, the MP board already knows how to run
  // a race. With no ghosts this collapses back to the single self-entry and the
  // room chrome stays hidden, exactly as before.
  const selfUsername = t('mp.rivals.you');
  const progress =
    config.durationSec > 0
      ? 1 - core.timer.remainingTime / config.durationSec
      : 0;

  const leaderboard = useMemo(
    () => [
      { username: selfUsername, score: core.score, wordCount: core.foundWords.length },
      ...buildGhostRows(config.ghosts ?? [], {
        perfectScore: config.perfectScore,
        totalWords: config.totalWords,
        progress,
        selfUsername,
      }),
    ],
    [
      selfUsername,
      core.score,
      core.foundWords.length,
      config.ghosts,
      config.perfectScore,
      config.totalWords,
      progress,
    ]
  );

  const gameActive = Boolean(core.grid) && !core.isPaused && !core.isGameOver && core.timer.remainingTime > 0;

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
      <InGameScreen
        username={selfUsername}
        gameCode="QUICK"
        isPlaying
        gameplayFocusMode
        t={t}
        dir={dir}
        socket={null}
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
      />
    </div>
  );
}

export default QuickClassicBoard;
