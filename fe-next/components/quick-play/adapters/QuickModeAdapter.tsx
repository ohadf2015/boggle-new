'use client';

/**
 * Mounts the right game component for a quick round and normalizes its
 * native completion payload into QuickRoundResult. One onDone, fired once —
 * re-entrancy guarded (lagged input-disable is not a guarantee; see blast
 * double-submit incident).
 */
import { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { QuickRoundConfig, QuickRoundResult } from '../types';
import { BlastQuickRound } from './BlastQuickRound';
import { fromWordWheel, fromSurvival, fromSinglePlayer } from './normalizeResult';

const SinglePlayerGame = dynamic(() => import('@/components/singleplayer/SinglePlayerGame'), { ssr: false });
const DailyWordHuntSurvival = dynamic(() => import('@/components/daily/DailyWordHuntSurvival'), { ssr: false });
const WordWheelGame = dynamic(() => import('@/components/daily/WordWheelGame'), { ssr: false });
interface QuickModeAdapterProps {
  config: QuickRoundConfig;
  onDone: (result: QuickRoundResult) => void;
  onQuit: () => void;
}

export function QuickModeAdapter({ config, onDone, onQuit }: QuickModeAdapterProps) {
  const doneRef = useRef(false);
  const wordSet = useRef<Set<string> | null>(null);

  const finish = useCallback(
    (result: QuickRoundResult) => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone(result);
    },
    [onDone]
  );

  switch (config.mode) {
    case 'wheel-rush': {
      if (!wordSet.current) wordSet.current = new Set(config.words ?? []);
      // Bounded flex-column stage — parity with the Daily Challenge playing
      // wrapper (WordWheelChallenge). WordWheelGame's mobile root is `flex-1`
      // and its wheel cluster uses `[container-type:size]`; both need a
      // definite-height flex-column ancestor. Rendered bare (the old Quick Game
      // path) the container-query block-size collapses to ~0 and the board flies
      // up into the timer/HUD — the crush this route showed under RTL/Hebrew.
      // `justify-start pt-3` gives clearance from the top HUD, `overflow-y-auto
      // overscroll-contain` lets it scroll on short viewports instead of
      // overlapping, and `pb-bottom-stack` keeps the found-words list clear of
      // the bottom nav/banner. Direction-agnostic: fixes LTR and RTL alike.
      return (
        <div className="relative flex flex-1 flex-col items-center justify-start min-h-0 overflow-y-auto overscroll-contain pt-3 sm:pt-4 pb-bottom-stack">
          <WordWheelGame
            puzzle={config.wheel as never}
            duration={config.durationSec}
            language={config.language as never}
            hideCompetitive
            onEffect={() => undefined}
            onValidateWord={async (word: string) => wordSet.current!.has(word.toLowerCase())}
            onComplete={(r: { wordsFound: string[]; score: number; timeSeconds: number }) =>
              finish(fromWordWheel(r, config))
            }
            onExit={onQuit}
          />
        </div>
      );
    }
    case 'word-hunt':
      return (
        <DailyWordHuntSurvival
          grid={config.grid}
          puzzleNumber={0}
          language={config.language as never}
          targetWord={config.targetWord ?? ''}
          practice
          onComplete={(r: { wordsDiscovered: Array<{ word: string }> }) =>
            finish(fromSurvival(r, config))
          }
          onQuit={onQuit}
        />
      );
    case 'blast':
      return <BlastQuickRound config={config} onDone={finish} onQuit={onQuit} />;
    case 'classic':
    default:
      return (
        <SinglePlayerGame
          settings={{
            mode: 'challenge',
            difficulty: 'MEDIUM',
            language: config.language as never,
            grid: config.grid as never,
            timerSeconds: config.durationSec,
            bots: [], // quick play is bot-free by design
            minWordLength: 3,
          }}
          targetHighScore={config.perfectScore}
          onGameEnd={(r: { playerScore: number; playerWords: string[] }) =>
            finish(fromSinglePlayer({ score: r.playerScore, wordsFound: r.playerWords }, config))
          }
          onQuit={onQuit}
        />
      );
  }
}
