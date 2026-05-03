'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import GridComponent from '@/components/GridComponent';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { fireOnboardingBurst, fireVictoryConfetti } from '@/utils/confettiUtils';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import type { LetterGrid } from '@/types';

interface Props {
  mode: Exclude<PracticeMode, 'wheelRush'>;
  rows: number;
  cols: number;
  goal: number;
}

const ACCENT: Record<Props['mode'], { dot: string; pill: string }> = {
  classic: { dot: 'bg-neo-cyan', pill: 'border-neo-cyan/60 text-neo-cyan' },
  wordHunt: { dot: 'bg-neo-lime', pill: 'border-neo-lime/60 text-neo-lime' },
};

/**
 * Real swipe-over-letters practice. Uses the production GridComponent and
 * dictionary-backed validation — same feel as the real game, minus the timer
 * and HUD chrome. Goal is intentionally tiny (3 words) so beginners reach the
 * win moment fast and get the celebration.
 */
export default function PracticeSwipeBoard({ mode, rows, cols, goal }: Props) {
  const { language, t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();
  const accent = ACCENT[mode];

  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const generateBoard = useCallback(
    () =>
      pickRichestBoardClient(
        () => generateRandomTable(rows, cols, language, []),
        language,
      ),
    [rows, cols, language],
  );
  const [grid, setGrid] = useState<LetterGrid>(() => generateBoard());

  const [formingWord, setFormingWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const celebratedRef = useRef(false);

  const {
    foundWords,
    currentFeedback,
    submitWord,
    reset: resetSubmission,
    validWordCount,
  } = useWordSubmission({
    grid,
    language,
    minWordLength: 3,
    mode: 'practice',
    t,
    onWordAccepted: () => {
      playWordAcceptedSound();
      haptics.success();
      // Tiny burst per word — keeps the win loop tight.
      fireOnboardingBurst({ x: 0.5, y: 0.45 });
    },
    onWordRejected: () => {
      playWordRejectedSound();
    },
  });

  const isComplete = validWordCount >= goal;

  useEffect(() => {
    if (isComplete && !celebratedRef.current) {
      celebratedRef.current = true;
      markPracticeMode(mode, language);
      fireVictoryConfetti();
    }
  }, [isComplete, mode, language]);

  const handleWordChange = useCallback((word: string, count: number) => {
    setFormingWord(word);
    setLetterCount(count);
  }, []);

  const handleNewBoard = useCallback(() => {
    setGrid(generateBoard());
    resetSubmission();
    celebratedRef.current = false;
    setFormingWord('');
    setLetterCount(0);
  }, [generateBoard, resetSubmission]);

  const validWords = useMemo(
    () => foundWords.filter((w) => w.isValid === true).map((w) => w.word.toUpperCase()),
    [foundWords],
  );

  return (
    <div
      data-testid="practice-swipe-board"
      data-mode={mode}
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-4 pt-4 pb-bottom-stack flex flex-col items-center gap-3"
    >
      <div className="w-full max-w-md flex items-center justify-between">
        <Link
          href={`/${language}/practice`}
          className="text-xs font-neo-display font-black text-neo-cream/60 hover:text-neo-cream"
        >
          {t('practiceSwipe.back')}
        </Link>
        <div
          data-testid="practice-progress"
          aria-label={t('practiceSwipe.progress', { found: validWordCount, goal })}
          className="flex items-center gap-1.5"
        >
          {Array.from({ length: goal }).map((_, i) => (
            <span
              key={i}
              className={
                'w-3 h-3 rounded-full border-2 border-neo-black ' +
                (i < validWordCount ? accent.dot : 'bg-neo-navy')
              }
            />
          ))}
        </div>
      </div>

      <h1
        data-testid="practice-instruction"
        className="text-base font-neo-display font-black text-neo-cream text-center max-w-md leading-tight"
      >
        {isComplete
          ? t('practiceSwipe.done')
          : t('practiceSwipe.instruction', { goal })}
      </h1>

      <WordFormingArea
        word={formingWord}
        letterCount={letterCount}
        feedback={currentFeedback}
        compact
        className="justify-center"
      />

      <div className="w-full max-w-md flex items-center justify-center">
        <div className="w-full" style={{ aspectRatio: '1 / 1' }}>
          <GridComponent
            grid={grid}
            interactive={!isComplete}
            onWordSubmit={submitWord}
            onWordChange={handleWordChange}
            hideWordPreview
            language={language}
            animateOnMount
          />
        </div>
      </div>

      {validWords.length > 0 && (
        <ul
          data-testid="practice-found-words"
          className="flex flex-wrap gap-1.5 justify-center max-w-md"
        >
          {validWords.map((w) => (
            <li
              key={w}
              className={`px-2 py-0.5 rounded text-xs font-neo-display font-bold border bg-neo-navy-light ${accent.pill}`}
            >
              {w}
            </li>
          ))}
        </ul>
      )}

      {isComplete ? (
        <Link
          href={`/${language}/practice`}
          data-testid="practice-continue-cta"
          className="mt-2 inline-flex items-center justify-center w-full max-w-md bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        >
          {t('practiceSwipe.continue')}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleNewBoard}
          data-testid="practice-new-board"
          className="mt-1 px-3 py-1 text-xs font-neo-display font-black text-neo-cream/60 underline underline-offset-2"
        >
          {t('practiceSwipe.newBoard')}
        </button>
      )}
    </div>
  );
}
