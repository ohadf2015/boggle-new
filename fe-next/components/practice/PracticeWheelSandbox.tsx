'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeInstructions from './PracticeInstructions';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
// Reuse REAL game-mode wheel primitives so practice and live wheel rush
// share visuals + animations. Future style updates to WheelLetter / WordTile
// auto-propagate to practice.
import { WheelLetter, WordTile } from '@/components/daily/WordWheelParts';
// Decorative orbital rings — same Pixi overlay the real wheel uses.
const WordWheelPixiRing = dynamic(() => import('@/components/daily/WordWheelPixiRing'), { ssr: false });

interface WheelPuzzle {
  /** Letter at the center — must appear in every accepted word. */
  center: string;
  /** Outer ring letters arranged clockwise from top (60° spacing). */
  outer: string[];
}

// 1 center + 6 outer = 7 letters total, matching real WheelRush
// (utils/dailyChallenge/wordWheelGeneration.ts:5).
// Hebrew is finals-free (no ם ץ ך ן ף).
const PUZZLES: Record<string, WheelPuzzle> = {
  en: { center: 'A', outer: ['T', 'R', 'C', 'E', 'S', 'N'] },
  he: { center: 'א', outer: ['ב', 'ה', 'ל', 'מ', 'ר', 'ת'] },
  sv: { center: 'A', outer: ['T', 'R', 'K', 'E', 'S', 'N'] },
  ja: { center: 'い', outer: ['ぬ', 'と', 'け', 'ま', 'ね', 'こ'] },
  es: { center: 'A', outer: ['C', 'S', 'M', 'E', 'L', 'R'] },
};

const RADIUS_PX = 84; // matches real WheelRush mid-breakpoint orbit

/**
 * Wheel-rush practice sandbox — TAP-BASED to mirror real WheelRush
 * (`components/daily/WordWheelGame.tsx`). Tap letters to build a word,
 * tap built tiles to remove, tap submit (or Enter) to validate.
 *
 * Reuses real components:
 *  - `<WheelLetter>` for center + outer rendering (animations, hover)
 *  - `<WordTile>` for the built-word builder
 * Validation is local (offline-friendly) but rules match real:
 *  - center letter must appear (real: WordWheelGame.tsx:462)
 *  - min 3 letters (real: WordWheelGame.tsx:455)
 *  - duplicate detection
 */
export default function PracticeWheelSandbox() {
  const { language, t } = useLanguage();
  const puzzle = PUZZLES[language] ?? PUZZLES.en;
  const allLetters = useMemo(() => [puzzle.center, ...puzzle.outer], [puzzle]);

  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wheelRush' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  // Built word as ordered list of (letter, originalIndex) — index 0 = center.
  const [built, setBuilt] = useState<Array<{ letter: string; originIndex: number }>>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | 'noCenter' | null>(null);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.wheelRush;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wheelRush', language);
      trackPracticeCompleted({
        mode: 'wheelRush',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const usedIndices = useMemo(() => new Set(built.map((b) => b.originIndex)), [built]);
  const word = useMemo(() => built.map((b) => b.letter).join(''), [built]);

  const onLetterPress = useCallback((_letter: string, idx: number, _el: HTMLButtonElement) => {
    if (usedIndices.has(idx)) return; // tap-to-remove handled on WordTile
    setBuilt((prev) => [...prev, { letter: allLetters[idx], originIndex: idx }]);
    setFeedback(null);
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [usedIndices, allLetters, advanceBeat]);

  const onTileRemove = useCallback((tileIndex: number) => {
    setBuilt((prev) => prev.filter((_, i) => i !== tileIndex));
  }, []);

  const onSubmit = useCallback(async () => {
    if (word.length < 3) return; // mirrors real (WordWheelGame.tsx:455)
    if (!word.includes(puzzle.center)) {
      setFeedback('noCenter');
      return;
    }
    if (foundWords.includes(word)) {
      setFeedback('dup');
      return;
    }
    const result = await validator.check(word);
    if (result.isValid) {
      setFoundWords((prev) => {
        const next = [...prev, word];
        trackPracticeWordFound({ mode: 'wheelRush', locale: language, word, wordsFound: next.length });
        return next;
      });
      setFeedback('ok');
      const tilePositions = built.map((b) => {
        const el = document.querySelector(`[data-wheel-index="${b.originIndex}"]`) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
      setBuilt([]);
    } else {
      setFeedback('bad');
      const el = document.querySelector(`[data-wheel-index="${built[0]?.originIndex}"]`);
      if (el) juice.triggerInvalid(el);
    }
  }, [word, puzzle.center, foundWords, validator, juice, language, built, advanceBeat]);

  // Submit-on-Enter for keyboard players (parity with real WheelRush).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSubmit]);

  // Auto-clear feedback toast after 1.4s (matches real WheelRush UX).
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  const mascotReaction: PracticeMascotMood = isComplete
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad' || feedback === 'noCenter'
        ? 'wrong'
        : 'idle';

  // Decorative practice score — sums letter counts × 1pt to mirror the
  // live wheel's score chip. Practice never persists this number; it's
  // purely so the HUD shape matches the real game.
  const previewScore = useMemo(
    () => foundWords.reduce((sum, w) => sum + w.length, 0),
    [foundWords],
  );

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3 min-h-[calc(100dvh-var(--bottom-stack-height,5rem))]">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wheelRush" reaction={mascotReaction} />

      {/* HUD strip — mode nav + score + decorative no-timer chip. Same
          three-segment shape as the live WheelRush HUD so the practice
          page is visually indistinguishable from the real thing. */}
      <div className="w-full flex items-center justify-between gap-2">
        <PracticeModeNav current="wheelRush" />
        <div className="flex items-center gap-2">
          <div
            data-testid="practice-wheel-score"
            className="px-2.5 py-1 rounded-full bg-neo-purple/20 border border-neo-purple text-neo-cream text-xs font-neo-display font-black whitespace-nowrap"
          >
            {t('practice.wheelRush.scoreChip', { score: previewScore })}
          </div>
          <div
            data-testid="practice-goal-indicator"
            className="px-2.5 py-1 rounded-full bg-neo-cream/10 border border-neo-cream/30 text-neo-cream text-xs font-neo-display font-black whitespace-nowrap"
          >
            {foundWords.length}/{PRACTICE_GOALS.wheelRush}
          </div>
        </div>
      </div>

      <PracticeInstructions mode="wheelRush" />

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      {/* Wheel — uses real WheelLetter for visual parity, with the real
          decorative PixiJS orbital ring overlay (pointer-events-none, lazy). */}
      <div data-testid="practice-wheel" className="relative w-56 h-56 sm:w-64 sm:h-64">
        <div className="absolute inset-0 pointer-events-none">
          <WordWheelPixiRing
            selectedIndices={Array.from(usedIndices)}
            radius={RADIUS_PX}
            combo={0}
          />
        </div>
        <WheelLetter
          letter={puzzle.center}
          isCenter
          index={0}
          isUsed={usedIndices.has(0)}
          onPress={onLetterPress}
        />
        {puzzle.outer.map((letter, i) => {
          const idx = i + 1;
          return (
            <WheelLetter
              key={`${letter}-${i}`}
              letter={letter}
              isCenter={false}
              index={idx}
              angle={i * (360 / puzzle.outer.length)}
              radius={RADIUS_PX}
              isUsed={usedIndices.has(idx)}
              onPress={onLetterPress}
            />
          );
        })}
      </div>

      {/* Feedback toast — mirrors real WheelRush feedback chrome. */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback}
            data-testid="practice-wheel-feedback"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={
              'px-3 py-1 rounded-neo border-2 text-xs font-neo-display font-black uppercase tracking-wider ' +
              (feedback === 'ok'
                ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                : feedback === 'noCenter'
                  ? 'bg-neo-pink/20 border-neo-pink text-neo-pink'
                  : feedback === 'dup'
                    ? 'bg-neo-cream/15 border-neo-cream/50 text-neo-cream/85'
                    : 'bg-neo-red/20 border-neo-red text-neo-red')
            }
          >
            {feedback === 'ok'
              ? t('practice.wheelRush.found')
              : feedback === 'noCenter'
                ? t('practice.wheelRush.needsCenter')
                : feedback === 'dup'
                  ? t('practice.wheelRush.duplicate')
                  : t('practice.wheelRush.notAWord')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Built-word builder — uses real WordTile (tap to remove). */}
      <div className="flex items-end gap-1 min-h-[3rem]" data-testid="practice-built-word">
        <AnimatePresence mode="popLayout">
          {built.map((b, i) => (
            <WordTile
              key={`${b.originIndex}-${i}`}
              letter={b.letter}
              index={i}
              isCenter={b.originIndex === 0}
              onRemove={onTileRemove}
            />
          ))}
        </AnimatePresence>
        {word.length >= 3 && (
          <button
            type="button"
            data-testid="practice-wheel-submit"
            onClick={onSubmit}
            aria-label="submit"
            className="ms-1 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard active:translate-y-px active:shadow-hard-pressed"
          >
            <Check className="w-5 h-5" aria-hidden />
          </button>
        )}
      </div>

      {/* Found words — last-found highlight matches real
          (WordWheelGame.tsx:951–985). */}
      <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem] w-full">
        {foundWords.map((w, i) => {
          const isLast = i === foundWords.length - 1;
          return (
            <li
              key={w}
              className={
                'px-2 py-0.5 rounded border text-xs font-neo-display font-bold transition-colors ' +
                (isLast
                  ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                  : 'bg-neo-navy-light border-neo-black/40 text-neo-cream')
              }
            >
              {w}
            </li>
          );
        })}
      </ul>

      {isComplete && <PracticeCompleteBanner mode="wheelRush" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="wheelRush"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-purple text-neo-cream border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
