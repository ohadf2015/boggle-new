'use client';

/**
 * Mounts the right game component for a quick round and normalizes its
 * native completion payload into QuickRoundResult. One onDone, fired once —
 * re-entrancy guarded (lagged input-disable is not a guarantee; see blast
 * double-submit incident).
 *
 * All four modes pass hideModeCoach so ModeCoach FTUE never blocks the arcade
 * loop. Stages are mode-specific: fill games (classic/blast/hunt) get a locked
 * height column with no nested page scroll; wheel keeps a scrollable stage so
 * short viewports can still reach the found-words list.
 */
import { useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { QuickRoundConfig, QuickRoundResult } from '../types';
import { BlastQuickRound } from './BlastQuickRound';
import { fromWordWheel, fromSurvival, fromSinglePlayer } from './normalizeResult';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';

// Classic board is mid-beta: admins get the multiplayer board (InGameScreen)
// run solo; everyone else keeps the previous single-player board until it's
// proven out. See the `isAdmin` branch in the classic case.
const QuickClassicBoard = dynamic(() => import('./QuickClassicBoard'), { ssr: false });
const SinglePlayerGame = dynamic(() => import('@/components/singleplayer/SinglePlayerGame'), { ssr: false });
const DailyWordHuntSurvival = dynamic(() => import('@/components/daily/DailyWordHuntSurvival'), { ssr: false });
const WordWheelGame = dynamic(() => import('@/components/daily/WordWheelGame'), { ssr: false });

/**
 * Shared locked column. items-stretch so game roots get full width (items-center
 * was crushing classic/blast/hunt to content width). overflow-hidden for fill
 * games; wheel uses STAGE_SCROLL so the cluster can scroll on short phones.
 */
const STAGE_BASE =
  'relative flex flex-1 flex-col items-stretch min-h-0 w-full bg-neo-navy';

/** Classic / blast — game owns overflow; definite height for flex-1 boards. */
const STAGE_FILL = `${STAGE_BASE} overflow-hidden`;

/**
 * Word hunt — survival already scrolls + pads; STAGE must not double that.
 */
const STAGE_HUNT = `${STAGE_BASE} overflow-hidden`;

/**
 * Wheel — parity with Daily WordWheelChallenge playing wrapper: bounded flex
 * column + scroll so container-type:size has a real height and short phones
 * can scroll the found-words list.
 */
const STAGE_WHEEL =
  `${STAGE_BASE} justify-start overflow-y-auto overscroll-contain pt-3 sm:pt-4 pb-bottom-stack`;

interface QuickModeAdapterProps {
  config: QuickRoundConfig;
  onDone: (result: QuickRoundResult) => void;
  onQuit: () => void;
}

export function QuickModeAdapter({ config, onDone, onQuit }: QuickModeAdapterProps) {
  const { isAdmin } = useAuth();
  const doneRef = useRef(false);
  const wordSet = useRef<Set<string> | null>(null);
  // Lock body height + hide bottom nav for the whole arcade round (classic /
  // wheel / blast never did this themselves — only word-hunt via Survival).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

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
        <div className={STAGE_WHEEL} data-testid="quick-stage-wheel-rush">
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
        <div className={STAGE_HUNT} data-testid="quick-stage-word-hunt">
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
            quitStaysOnPage
          />
        </div>
      );
    case 'blast':
      return (
        <div className={STAGE_FILL} data-testid="quick-stage-blast">
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
            <BlastQuickRound config={config} onDone={finish} onQuit={onQuit} hideModeCoach />
          </div>
        </div>
      );
    case 'classic':
    default:
      return (
        <div className={STAGE_FILL} data-testid="quick-stage-classic">
          {isAdmin ? (
            /* BETA (admin-only): the MULTIPLAYER board (InGameScreen) run solo —
               the board players see in a live room, not the legacy SP layout. */
            <QuickClassicBoard config={config} onDone={finish} onQuit={onQuit} />
          ) : (
            /* Everyone else keeps the previous single-player board until the MP
               board is proven out. PortraitGameLayout needs flex-1 h-full. */
            <div className="relative flex h-full min-h-0 w-full flex-1 flex-col px-2 sm:px-3">
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
                targetHighScore={null}
                hideModeCoach
                onGameEnd={(r: { playerScore: number; playerWords: string[] }) =>
                  finish(fromSinglePlayer({ score: r.playerScore, wordsFound: r.playerWords }, config))
                }
                onQuit={onQuit}
                quitStaysOnPage
              />
            </div>
          )}
        </div>
      );
  }
}
