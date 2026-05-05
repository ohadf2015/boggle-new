'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
// Reuse the REAL game grid + discoveries list. Future visual updates to
// these primitives auto-propagate to practice.
import GridComponent from '@/components/GridComponent';
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';

// Curated practice boards — Hebrew is finals-free (matches real letter
// pool in lib/adventure/gridConstants.ts). Each board is hand-picked to
// ensure ≥3 simple findable words per locale.
const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

/**
 * Classic practice sandbox — uses the REAL <GridComponent> so visuals,
 * animations, drag/keyboard input, accessibility, and combo escalation
 * all match production. Practice-only chrome (mascot, instructions,
 * goal pill, chain CTA) wraps the shared grid.
 *
 * Validation goes through the practice validator (offline-friendly,
 * session-cached) — the only thing different from real classic mode.
 */
export default function PracticeClassicSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'classic' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const [foundWords, setFoundWords] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | null>(null);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.classic;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'classic', locale: language });
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('classic', language);
      trackPracticeCompleted({
        mode: 'classic',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const handleWordSubmit = useCallback(async (rawWord: string) => {
    if (rawWord.length < 2) return;
    const upper = rawWord.toUpperCase();
    if (foundWords.some((w) => w.word === upper)) {
      setFeedback('dup');
      return;
    }
    const result = await validator.check(upper);
    if (result.isValid) {
      setFoundWords((prev) => {
        const next = [
          ...prev,
          { word: upper, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
        ];
        trackPracticeWordFound({
          mode: 'classic', locale: language, word: upper, wordsFound: next.length,
        });
        return next;
      });
      setFeedback('ok');
      // Use the GridComponent's data-row/data-col attrs to find tile centers
      // for the particle juice. Falls back gracefully if cells aren't in DOM.
      const cells = Array.from(document.querySelectorAll('[data-row][data-col]')) as HTMLElement[];
      const positions = cells.slice(0, upper.length).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, el };
      });
      juice.triggerWordFound(positions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    } else {
      setFeedback('bad');
      const tile = document.querySelector('[data-row][data-col]');
      if (tile) juice.triggerInvalid(tile);
    }
  }, [foundWords, validator, juice, language, advanceBeat]);

  // Detect first-drag for tutorial beat advance.
  const onSelectionChange = useCallback(() => {
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [advanceBeat]);

  const mascotReaction: PracticeMascotMood = isComplete
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad'
        ? 'wrong'
        : 'idle';

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3 min-h-[calc(100dvh-var(--bottom-stack-height,5rem))]">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="classic" reaction={mascotReaction} />

      {/* HUD strip — mode nav left, goal pill right. Same vertical real-estate
          as the live game's score/timer row, so the practice screen feels
          like the real thing. */}
      <div className="w-full flex items-center justify-between gap-2">
        <PracticeModeNav current="classic" />
        <div
          data-testid="practice-goal-indicator"
          className="px-2.5 py-1 rounded-full bg-neo-cyan/20 border border-neo-cyan text-neo-cream text-xs font-neo-display font-black whitespace-nowrap"
        >
          {foundWords.length}/{PRACTICE_GOALS.classic}
        </div>
      </div>

      <PracticeInstructions mode="classic" />

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      <div data-testid="practice-board" className="w-full max-w-xs aspect-square">
        <GridComponent
          grid={board}
          interactive
          onWordSubmit={handleWordSubmit}
          onSelectionChange={onSelectionChange}
          hideComboIndicator
          language={language}
        />
      </div>

      <div className="w-full" data-testid="practice-discoveries">
        <DiscoveredWordsList words={foundWords} t={t} />
      </div>

      {isComplete && <PracticeCompleteBanner mode="classic" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="classic"
          className="mt-auto inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
