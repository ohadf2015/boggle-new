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
import { useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { QuickRoundConfig, QuickRoundResult } from '../types';
import { BlastQuickRound } from './BlastQuickRound';
import { fromWordWheel, fromSurvival } from './normalizeResult';
import { ghostsToWheelRivals } from '@/lib/quickPlay/ghostRivals';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Classic runs the multiplayer board (InGameScreen) solo for everyone.
const QuickClassicBoard = dynamic(() => import('./QuickClassicBoard'), { ssr: false });
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
  const { t } = useLanguage();
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

  // Wheel + word-hunt rivals are finished targets ("N points to pass Ada"), so
  // they need no per-tick pacing — unlike the classic/blast boards, which race
  // them live on the MP leaderboard. Word hunt in particular has no round clock
  // to pace against (it is life-drain survival, not a timer).
  const selfUsername = t('mp.rivals.you');
  const wheelRivals = useMemo(() => {
    const rows = ghostsToWheelRivals(config.ghosts ?? [], config.perfectScore, selfUsername);
    return rows.length > 0 ? rows : undefined;
  }, [config.ghosts, config.perfectScore, selfUsername]);

  const huntRivals = useMemo(
    () => wheelRivals?.map((r) => ({ username: r.name, score: r.score })),
    [wheelRivals]
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
            // The wheel owns a rival pill + pass toasts already; hideCompetitive
            // only switches them off because the DAILY board is the wrong cohort
            // for a quick round. Hand it the quick-play ghosts instead — undefined
            // when there are none, so the pill stays hidden rather than empty.
            rivals={wheelRivals}
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
            practice={true}
            rivals={huntRivals}
            hideModeCoach={true}
            onComplete={(r: { wordsDiscovered: Array<{ word: string }> }) =>
              finish(fromSurvival(r, config))
            }
            onQuit={onQuit}
            quitStaysOnPage={true}
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
      /* The MULTIPLAYER board (InGameScreen) run solo — the board players see in
         a live room, not the legacy SP layout. Ghost rivals need its standings
         chrome, so there is deliberately no single-player fallback here. */
      return (
        <div className={STAGE_FILL} data-testid="quick-stage-classic">
          <QuickClassicBoard config={config} onDone={finish} onQuit={onQuit} />
        </div>
      );
  }
}
