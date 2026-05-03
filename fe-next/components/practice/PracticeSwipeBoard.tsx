'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { Mascot, type MascotVariant } from '@/components/ui/Mascot';
import GridComponent from '@/components/GridComponent';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { fireOnboardingBurst, fireVictoryConfetti } from '@/utils/confettiUtils';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import PracticeCompleteCard from './PracticeCompleteCard';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import type { LetterGrid } from '@/types';

interface Props {
  mode: Exclude<PracticeMode, 'wheelRush'>;
  rows: number;
  cols: number;
  goal: number;
}

const ACCENT: Record<Props['mode'], { dot: string; pill: string; bubble: string; ring: string }> = {
  classic: {
    dot: 'bg-neo-cyan',
    pill: 'border-neo-cyan/60 text-neo-cyan',
    bubble: 'bg-neo-cyan',
    ring: 'border-neo-cyan',
  },
  wordHunt: {
    dot: 'bg-neo-lime',
    pill: 'border-neo-lime/60 text-neo-lime',
    bubble: 'bg-neo-lime',
    ring: 'border-neo-lime',
  },
};

const IDLE_MASCOT: Record<Props['mode'], MascotVariant> = {
  classic: 'encouraging',
  wordHunt: 'explorer',
};

const WIN_MASCOT: Record<Props['mode'], MascotVariant> = {
  classic: 'celebration',
  wordHunt: 'flexing',
};

/** Pick desired hunt slot lengths from board size — small variety. */
function huntLengthsFor(goal: number): number[] {
  const lengths = [3, 4, 5];
  return Array.from({ length: goal }, (_, i) => lengths[i % lengths.length]);
}

/**
 * Real swipe-over-letters practice. Uses the production GridComponent and
 * dictionary-backed validation. Adds a friendly mascot, bigger per-word
 * celebration moments, and a Word Hunt variant where slots represent specific
 * word lengths to fill (distinct mini-game feel from Classic).
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
  const [pop, setPop] = useState<{ id: number; word: string; label: string } | null>(null);
  const popIdRef = useRef(0);
  const celebratedRef = useRef(false);

  // Word Hunt slots: each slot wants a word of a specific length. Once a
  // valid word matches a slot's length, the slot fills with that word.
  const huntLengths = useMemo(() => huntLengthsFor(goal), [goal]);
  const [huntSlots, setHuntSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: goal }, () => null),
  );

  const handleAccepted = useCallback(
    (word: string, _score: number) => {
      playWordAcceptedSound();
      haptics.success();
      // Pop a tiny celebration label per word
      const labels = [
        t('practiceSwipe.celebrate1'),
        t('practiceSwipe.celebrate2'),
        t('practiceSwipe.celebrate3'),
        t('practiceSwipe.celebrate4'),
      ];
      popIdRef.current += 1;
      setPop({
        id: popIdRef.current,
        word,
        label: labels[Math.min(labels.length - 1, Math.floor(Math.random() * labels.length))],
      });
      setTimeout(() => {
        setPop((cur) => (cur && cur.id === popIdRef.current ? null : cur));
      }, 900);
      fireOnboardingBurst({ x: 0.5, y: 0.4 });

      // Word Hunt: try to fill an empty slot whose required length matches
      if (mode === 'wordHunt') {
        setHuntSlots((prev) => {
          const idx = prev.findIndex((s, i) => s === null && huntLengths[i] === word.length);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = word.toUpperCase();
          return next;
        });
      }
    },
    [playWordAcceptedSound, t, mode, huntLengths],
  );

  const {
    foundWords,
    currentFeedback,
    submitWord,
    reset: resetSubmission,
    validWordCount,
  } = useWordSubmission({
    grid,
    language,
    minWordLength: 2,
    mode: 'practice',
    t,
    onWordAccepted: handleAccepted,
    onWordRejected: () => {
      playWordRejectedSound();
    },
  });

  const huntFilled = huntSlots.filter(Boolean).length;
  const isComplete = mode === 'wordHunt' ? huntFilled >= goal : validWordCount >= goal;

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
    setHuntSlots(Array.from({ length: goal }, () => null));
  }, [generateBoard, resetSubmission, goal]);

  const validWords = useMemo(
    () => foundWords.filter((w) => w.isValid === true).map((w) => w.word.toUpperCase()),
    [foundWords],
  );

  const mascotVariant = isComplete ? WIN_MASCOT[mode] : IDLE_MASCOT[mode];
  const greet = mode === 'wordHunt' ? t('practiceSwipe.greetWordHunt') : t('practiceSwipe.greet');
  const instruction = isComplete
    ? t('practiceSwipe.done')
    : mode === 'wordHunt'
      ? t('practiceSwipe.instructionWordHunt', { goal })
      : t('practiceSwipe.instruction', { goal });

  return (
    <div
      data-testid="practice-swipe-board"
      data-mode={mode}
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-4 pt-3 pb-bottom-stack flex flex-col items-center gap-3"
    >
      <div className="w-full max-w-md flex items-center justify-between">
        <Link
          href={`/${language}/practice`}
          className="text-xs font-neo-display font-black text-neo-cream/60 hover:text-neo-cream"
        >
          {t('practiceSwipe.back')}
        </Link>
        {mode !== 'wordHunt' && (
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
        )}
        {mode === 'wordHunt' && (
          <div
            data-testid="practice-progress"
            aria-label={t('practiceSwipe.progress', { found: huntFilled, goal })}
            className="flex items-center gap-1.5"
          >
            {Array.from({ length: goal }).map((_, i) => (
              <span
                key={i}
                className={
                  'w-3 h-3 rounded-full border-2 border-neo-black ' +
                  (huntSlots[i] ? accent.dot : 'bg-neo-navy')
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-md flex items-center gap-2">
        <Mascot variant={mascotVariant} size="xs" clipShape="circle" clipBorder={mode === 'classic' ? 'cyan' : 'lime'} />
        <div className={`relative flex-1 ${accent.bubble} text-neo-black border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm`}>
          <p className="text-xs font-neo-display font-black uppercase tracking-wide leading-tight">
            {greet}
          </p>
          <p data-testid="practice-instruction" className="text-sm font-neo-body font-bold leading-tight">
            {instruction}
          </p>
        </div>
      </div>

      {mode === 'wordHunt' && (
        <div data-testid="practice-hunt-slots" className="w-full max-w-md flex justify-center gap-2">
          {huntSlots.map((slot, i) => {
            const length = huntLengths[i];
            return (
              <div
                key={i}
                data-testid={`practice-hunt-slot-${i}`}
                data-filled={slot ? 'true' : 'false'}
                className={
                  'flex-1 rounded-neo border-2 border-neo-black px-2 py-1 text-center transition-colors ' +
                  (slot ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream/70')
                }
              >
                {slot ? (
                  <span className="font-neo-display font-black text-base tracking-wider">{slot}</span>
                ) : (
                  <span className="font-neo-body font-bold text-xs uppercase tracking-wider">
                    {t('practiceSwipe.huntSlot', { length })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WordFormingArea
        word={formingWord}
        letterCount={letterCount}
        feedback={currentFeedback}
        compact
        className="justify-center"
      />

      <div className="relative w-full max-w-md flex items-center justify-center">
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
        <AnimatePresence>
          {pop && (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: -10 }}
              exit={{ opacity: 0, scale: 0.7, y: -40 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="absolute pointer-events-none z-10 bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard"
            >
              <span className="font-neo-display font-black text-lg uppercase tracking-wide">
                {pop.label}
              </span>
              <span className="block text-xs font-neo-body font-bold opacity-90 text-center">
                +{pop.word.toUpperCase()}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="mt-2 w-full flex justify-center">
          <PracticeCompleteCard
            mode={mode}
            words={validWords}
            locale={language}
            onPlayAgain={handleNewBoard}
          />
        </div>
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
