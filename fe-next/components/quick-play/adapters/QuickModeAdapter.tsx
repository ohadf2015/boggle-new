'use client';

/**
 * Mounts the right game component for a quick round and normalizes its
 * native completion payload into QuickRoundResult. One onDone, fired once —
 * re-entrancy guarded (lagged input-disable is not a guarantee; see blast
 * double-submit incident).
 *
 * All four modes pass hideModeCoach so ModeCoach FTUE never blocks the arcade
 * loop (returning + first-time players play immediately).
 */
import { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { QuickRoundConfig, QuickRoundResult } from '../types';
import { BlastQuickRound } from './BlastQuickRound';
import { fromWordWheel, fromSurvival, fromSinglePlayer } from './normalizeResult';

const SinglePlayerGame = dynamic(() => import('@/components/singleplayer/SinglePlayerGame'), { ssr: false });
const DailyWordHuntSurvival = dynamic(() => import('@/components/daily/DailyWordHuntSurvival'), { ssr: false });
const WordWheelGame = dynamic(() => import('@/components/daily/WordWheelGame'), { ssr: false });

/** Shared stage shell — bounded flex column so boards don't crush into HUD. */
const STAGE =
  'relative flex flex-1 flex-col items-center justify-start min-h-0 overflow-y-auto overscroll-contain pt-3 sm:pt-4 pb-bottom-stack w-full';

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
      // definite-height flex-column ancestor.
      return (
        <div className={STAGE} data-testid="quick-stage-wheel-rush">
          <WordWheelGame
            puzzle={config.wheel as never}
            duration={config.durationSec}
            language={config.language as never}
            hideCompetitive
            hideModeCoach
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
        <div className={STAGE} data-testid="quick-stage-word-hunt">
          <DailyWordHuntSurvival
            grid={config.grid}
            puzzleNumber={0}
            language={config.language as never}
            targetWord={config.targetWord ?? ''}
            practice
            hideModeCoach
            onComplete={(r: { wordsDiscovered: Array<{ word: string }> }) =>
              finish(fromSurvival(r, config))
            }
            onQuit={onQuit}
          />
        </div>
      );
    case 'blast':
      return (
        <div className={STAGE} data-testid="quick-stage-blast">
          <BlastQuickRound config={config} onDone={finish} onQuit={onQuit} hideModeCoach />
        </div>
      );
    case 'classic':
    default:
      return (
        <div className={STAGE} data-testid="quick-stage-classic">
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
            hideModeCoach
            onGameEnd={(r: { playerScore: number; playerWords: string[] }) =>
              finish(fromSinglePlayer({ score: r.playerScore, wordsFound: r.playerWords }, config))
            }
            onQuit={onQuit}
          />
        </div>
      );
  }
}
