'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import PracticeCompletePopup from './PracticeCompletePopup';
import PracticePostCompleteChip from './PracticePostCompleteChip';
import PracticeBailoutCta from './PracticeBailoutCta';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import PracticeInstructions from './PracticeInstructions';
import PracticeCoachTip from './PracticeCoachTip';
import PracticeMistakeCoach, { usePracticeMistakeCoach } from './PracticeMistakeCoach';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial } from '@/lib/practice/microTutorial';
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
// Real-game celebration primitives — keeps practice feeling identical
// to live Classic when a word is found.
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import InlineConfetti from '@/components/effects/InlineConfetti';
import { WordFeedbackToast, type FeedbackType } from '@/components/daily/WordFeedbackToast';
import { AnimatePresence, m } from 'framer-motion';

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
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const juice = usePracticeJuice({ fxRef, burstColor: 0x00ffff });
  const sound = useSoundEffects();
  const tutorialRef = useRef(createMicroTutorial({ mode: 'classic' }));
  const advanceBeat = useCallback(() => { tutorialRef.current.currentBeat(); }, []);

  const [foundWords, setFoundWords] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [toast, setToast] = useState<{ type: FeedbackType; message: string } | null>(null);
  const [scorePopup, setScorePopup] = useState<{ key: number; word: string } | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.classic;
  // Friendly mid-game coaching — fires once per session per mistake kind.
  const coach = usePracticeMistakeCoach();
  const badCountRef = useRef(0);

  // Full-screen game surface — hide the site footer + bottom nav (matches
  // every other game screen), so the board fits one viewport without scroll.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

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
      sound.playWordAcceptedSound?.();
      setConfettiKey((k) => k + 1);
      // Real-game-style "+points" popup over the board.
      setScorePopup({ key: Date.now(), word: upper });
      // Real WordFeedbackToast — same component DailyChallengeGame uses.
      setToast({ type: 'valid-word', message: `+${upper.length} ${upper}` });
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    } else {
      setFeedback('bad');
      sound.playWordRejectedSound?.();
      setToast({ type: 'invalid-word', message: t('practice.classic.notAWord') || upper });
      const tile = document.querySelector('[data-row][data-col]');
      if (tile) juice.triggerInvalid(tile);
      // Mistake coach: 1st invalid → "real words only" buddy popup;
      // 2nd → "diagonals work too!" hint (player may be stuck on rows).
      // Each kind fires once per session — never nags.
      badCountRef.current += 1;
      if (badCountRef.current === 1) coach.trigger('notAWord');
      else if (badCountRef.current === 2) coach.trigger('diagonalsOk');
    }
  }, [foundWords, validator, juice, sound, language, advanceBeat, t, coach]);

  // Detect first-drag for tutorial beat advance.
  const onSelectionChange = useCallback(() => {
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [advanceBeat]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-3 pb-2 gap-2 h-[calc(100dvh-var(--bottom-stack-height,0rem))] overflow-hidden">
      <PracticePixiFx ref={fxRef} />

      {/* HUD strip — back-to-hub left, goal pill right. */}
      <div className="w-full flex items-center justify-between gap-2">
        <Link
          href={`/${language}/practice`}
          data-testid="practice-back-to-hub"
          aria-label={t('practiceHub.backToHub')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-neo-cream/30 text-xs font-neo-display font-black text-neo-white hover:text-neo-white hover:border-neo-cream/60 shrink-0 transition-colors opacity-70 hover:opacity-100"
        >
          <ArrowLeft className="w-3 h-3 rtl:rotate-180" aria-hidden />
          <span>{t('practiceHub.backToHub')}</span>
        </Link>
        <div
          data-testid="practice-goal-indicator"
          className="px-2.5 py-1 rounded-full bg-neo-cyan/25 border-2 border-neo-cyan text-neo-white text-xs font-neo-display font-black whitespace-nowrap"
        >
          {foundWords.length}/{PRACTICE_GOALS.classic}
        </div>
      </div>

      {/* Learn by doing: no upfront modal gate — the player lands on the
          board with a gentle inline tip that retires the moment they spell
          their first word. The "?" pill stays for on-demand reference. */}
      <PracticeInstructions mode="classic" autoOpen={false} />
      <PracticeCoachTip mode="classic" wordsFound={foundWords.length} />
      <PracticeMistakeCoach kind={coach.active} mode="classic" onClose={coach.close} />

      <div className="flex-1 min-h-0 flex items-center justify-center w-full">
        <div data-testid="practice-board" className="w-full max-w-xs aspect-square">
          <GridComponent
            grid={board}
            interactive
            onWordSubmit={handleWordSubmit}
            onSelectionChange={onSelectionChange}
            hideComboIndicator
            language={language}
            autoSubmitIdleMs={1000}
          />
        </div>
      </div>

      <div className="flex-shrink-0 w-full max-h-[2.5rem] overflow-hidden" data-testid="practice-discoveries">
        <DiscoveredWordsList words={foundWords} t={t} />
      </div>

      {confettiKey > 0 && (
        <div data-testid="practice-confetti" className="absolute left-1/2 top-32 -translate-x-1/2 pointer-events-none">
          <InlineConfetti key={confettiKey} size="md" />
        </div>
      )}

      {/* Real WordFeedbackToast (same as DailyChallengeGame) — full
          word-validation feedback parity. */}
      <WordFeedbackToast
        type={toast?.type ?? null}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      {/* Floating "+N pts" popup — mirrors live wheel game (lastWordScore). */}
      <AnimatePresence>
        {scorePopup && (
          <m.div
            key={scorePopup.key}
            data-testid="practice-score-popup"
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            onAnimationComplete={() => setScorePopup(null)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-base shadow-hard"
          >
            +{scorePopup.word.length} pts
          </m.div>
        )}
      </AnimatePresence>

      {/* Always-visible escape to the real game — a quiet ghost link, not a
          loud button, so it never competes with the board for attention. */}
      <div className="mt-auto w-full">
        <PracticeBailoutCta
          mode="classic"
          done={isComplete}
          href={practiceTargetUrl('classic', language)}
        />
      </div>

      <PracticeCompletePopup
        open={isComplete && !popupDismissed}
        mode="classic"
        onDismiss={() => setPopupDismissed(true)}
      />
      <PracticePostCompleteChip open={isComplete && popupDismissed} mode="classic" />
    </div>
  );
}
