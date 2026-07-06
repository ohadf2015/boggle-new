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
      return (
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
