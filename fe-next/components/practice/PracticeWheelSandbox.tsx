'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Check, RotateCcw, Shuffle } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import PracticeCompletePopup from './PracticeCompletePopup';
import PracticePostCompleteChip from './PracticePostCompleteChip';
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
// Reuse REAL game-mode wheel primitives so practice and live wheel rush
// share visuals + animations. Future style updates to WheelLetter / WordTile
// auto-propagate to practice.
import { WheelLetter, WordTile } from '@/components/daily/WordWheelParts';
// Real-game celebration primitives — sound + confetti on word found.
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import InlineConfetti from '@/components/effects/InlineConfetti';
import { WordFeedbackToast, type FeedbackType } from '@/components/daily/WordFeedbackToast';
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
  // Full-screen game surface — hide site footer + bottom nav (no page scroll).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  const puzzle = PUZZLES[language] ?? PUZZLES.en;
  // Outer letters live in state so Shuffle can rearrange them. Reset on
  // language change so locale switches still pull from PUZZLES correctly.
  const [outerLetters, setOuterLetters] = useState<string[]>(puzzle.outer);
  useEffect(() => { setOuterLetters(puzzle.outer); }, [puzzle]);
  const allLetters = useMemo(() => [puzzle.center, ...outerLetters], [puzzle.center, outerLetters]);

  const validator = usePracticeValidator(language);
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const juice = usePracticeJuice({ fxRef, burstColor: 0x8b5cf6 });
  const sound = useSoundEffects();
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wheelRush' }));
  const advanceBeat = useCallback(() => { tutorialRef.current.currentBeat(); }, []);

  // Built word as ordered list of (letter, originalIndex) — index 0 = center.
  const [built, setBuilt] = useState<Array<{ letter: string; originIndex: number }>>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | 'noCenter' | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [scorePopup, setScorePopup] = useState<{ key: number; points: number } | null>(null);
  const [toast, setToast] = useState<{ type: FeedbackType; message: string } | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  // Bad-feedback shake on the built-word builder — matches real WordWheelGame
  // (lines 290-293). Visual confirmation the word was rejected without a
  // textual error in the player's reading path.
  const [builderShake, setBuilderShake] = useState(false);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.wheelRush;

  // ── Drag-to-spell + idle auto-submit refs (parity with real WordWheelGame
  // lines 162-397). Drag engages only after pointer moves to a DIFFERENT
  // letter than the start so single taps stay single taps. ──
  const draggingRef = useRef(false);
  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const idleSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const builtRef = useRef(built);
  const usedIndicesRef = useRef<Set<number>>(new Set());
  useEffect(() => { builtRef.current = built; }, [built]);
  // Friendly mid-game coaching — fires once per session per mistake kind.
  const coach = usePracticeMistakeCoach();
  const badCountRef = useRef(0);

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
  useEffect(() => { usedIndicesRef.current = usedIndices; }, [usedIndices]);
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
      // Coach the rule the first time — this IS the rule of wheel rush.
      coach.trigger('needsCenter');
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
      sound.playWordAcceptedSound?.();
      setConfettiKey((k) => k + 1);
      // Score popup + word-length sound — mirrors live wheel
      // (WordWheelGame.tsx:490-512).
      const points = word.length;
      setScorePopup({ key: Date.now(), points });
      sound.playWordLengthSound?.(word.length);
      setToast({ type: 'valid-word', message: `+${points} ${word}` });
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
      setBuilt([]);
    } else {
      setFeedback('bad');
      sound.playWordRejectedSound?.();
      const el = document.querySelector(`[data-wheel-index="${built[0]?.originIndex}"]`);
      if (el) juice.triggerInvalid(el);
      // 1st invalid attempt → friendly "real words only" coach.
      badCountRef.current += 1;
      if (badCountRef.current === 1) coach.trigger('notAWord');
    }
  }, [word, puzzle.center, foundWords, validator, juice, sound, language, built, advanceBeat, coach]);

  // Submit-on-Enter for keyboard players (parity with real WheelRush).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSubmit]);

  // ── Idle 1s auto-submit (parity with real WordWheelGame.tsx:189-199) ──
  // After the player stops adding letters for 1s with ≥3 letters built, auto
  // submit. Bad-feedback cancels (player is reading the rejection message).
  useEffect(() => {
    if (idleSubmitTimerRef.current) {
      clearTimeout(idleSubmitTimerRef.current);
      idleSubmitTimerRef.current = null;
    }
    if (built.length >= 3 && !isComplete && feedback !== 'bad' && feedback !== 'noCenter') {
      idleSubmitTimerRef.current = setTimeout(() => {
        idleSubmitTimerRef.current = null;
        onSubmit();
      }, 1000);
    }
    return () => {
      if (idleSubmitTimerRef.current) {
        clearTimeout(idleSubmitTimerRef.current);
        idleSubmitTimerRef.current = null;
      }
    };
  }, [built, isComplete, feedback, onSubmit]);

  // ── Drag-to-spell (parity with real WordWheelGame.tsx:353-397) ──
  // Drag only engages once pointer moves to a different letter than the start
  // — so single taps stay single taps and onClick still fires.
  const tryDragHit = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    if (!btn) return;
    const idx = Number(btn.dataset.wheelIndex);
    if (idx === lastDragIdxRef.current) return;
    if (!dragEngagedRef.current) {
      const startIdx = dragStartIdxRef.current;
      if (startIdx === null || idx === startIdx) return;
      dragEngagedRef.current = true;
      lastDragIdxRef.current = startIdx;
      const startBtn = document.querySelector<HTMLButtonElement>(
        `[data-wheel-index="${startIdx}"]`,
      );
      if (startBtn && !usedIndicesRef.current.has(startIdx)) {
        const startLetter = startBtn.dataset.wheelLetter || '';
        setBuilt((prev) => [...prev, { letter: startLetter, originIndex: startIdx }]);
      }
    }
    if (usedIndicesRef.current.has(idx)) return;
    lastDragIdxRef.current = idx;
    const letter = btn.dataset.wheelLetter || '';
    setBuilt((prev) => [...prev, { letter, originIndex: idx }]);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    dragEngagedRef.current = false;
    lastDragIdxRef.current = null;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    dragStartIdxRef.current = btn ? Number(btn.dataset.wheelIndex) : null;
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointerPosRef.current = { x: e.clientX, y: e.clientY };
    if (!draggingRef.current) return;
    tryDragHit(e.clientX, e.clientY);
  }, [tryDragHit]);
  const handlePointerUp = useCallback(() => {
    pointerPosRef.current = null;
    const wasEngaged = dragEngagedRef.current;
    draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
    if (wasEngaged && builtRef.current.length >= 3) {
      if (idleSubmitTimerRef.current) {
        clearTimeout(idleSubmitTimerRef.current);
        idleSubmitTimerRef.current = null;
      }
      onSubmit();
    }
  }, [onSubmit]);

  // ── Reset (clear built word) ──
  const handleReset = useCallback(() => {
    setBuilt([]);
    setFeedback(null);
    sound.playButtonClickSound?.();
  }, [sound]);

  // ── Shuffle outer letters (parity with real WordWheelGame.tsx:417-441) ──
  // Built letters carry positional wheelIndex; after shuffle the same index
  // would point to a different letter. Remap each built tile to its new
  // position by letter (preferring unused positions for duplicates); drop any
  // that can't be relocated. Center letter (originIndex 0) is unaffected.
  const handleShuffle = useCallback(() => {
    setOuterLetters((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setBuilt((prevBuilt) => {
        const claimed = new Set<number>();
        const remapped: typeof prevBuilt = [];
        for (const b of prevBuilt) {
          if (b.originIndex === 0) { remapped.push(b); continue; }
          const newIdx = arr.findIndex((l, idx) => l === b.letter && !claimed.has(idx + 1));
          if (newIdx !== -1) {
            claimed.add(newIdx + 1);
            remapped.push({ letter: b.letter, originIndex: newIdx + 1 });
          }
        }
        return remapped;
      });
      return arr;
    });
    sound.playBoardShuffleSound?.();
  }, [sound]);

  // Auto-clear feedback toast after 1.4s (matches real WheelRush UX).
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  // Trigger builder shake when feedback flips to bad/noCenter — auto-clears
  // after 400ms (one shake cycle).
  useEffect(() => {
    if (feedback !== 'bad' && feedback !== 'noCenter') return;
    setBuilderShake(true);
    const id = setTimeout(() => setBuilderShake(false), 400);
    return () => clearTimeout(id);
  }, [feedback]);


  // Decorative practice score — sums letter counts × 1pt to mirror the
  // live wheel's score chip. Practice never persists this number; it's
  // purely so the HUD shape matches the real game.
  const previewScore = useMemo(
    () => foundWords.reduce((sum, w) => sum + w.length, 0),
    [foundWords],
  );

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-3 pb-2 gap-2 h-[calc(100dvh-var(--bottom-stack-height,0rem))] overflow-hidden">
      <PracticePixiFx ref={fxRef} />

      {/* HUD strip — back-to-hub + score + decorative no-timer chip. Same
          three-segment shape as the live WheelRush HUD so the practice
          page is visually indistinguishable from the real thing. */}
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
        <div className="flex items-center gap-2">
          <div
            data-testid="practice-wheel-score"
            className="px-2.5 py-1 rounded-full bg-neo-purple/20 border border-neo-purple text-neo-white text-xs font-neo-display font-black whitespace-nowrap"
          >
            {t('practice.wheelRush.scoreChip', { score: previewScore })}
          </div>
          <div
            data-testid="practice-goal-indicator"
            className="px-2.5 py-1 rounded-full bg-neo-cream/10 border border-neo-cream/30 text-neo-white text-xs font-neo-display font-black whitespace-nowrap"
          >
            {foundWords.length}/{PRACTICE_GOALS.wheelRush}
          </div>
        </div>
      </div>

      {/* Learn by doing: no modal gate — an inline tip guides the first word
          then steps aside. */}
      <PracticeInstructions mode="wheelRush" autoOpen={false} />
      <PracticeCoachTip mode="wheelRush" wordsFound={foundWords.length} />
      <PracticeMistakeCoach kind={coach.active} mode="wheelRush" onClose={coach.close} />

      {/* Wheel — uses real WheelLetter for visual parity, with the real
          decorative PixiJS orbital ring overlay (pointer-events-none, lazy).
          Pointer handlers wire drag-to-spell so practice feels exactly like
          live WheelRush. Single taps still pass through via WheelLetter's
          onClick because dragEngagedRef gates the additive logic. */}
      <div
        data-testid="practice-wheel"
        className="relative w-56 h-56 sm:w-64 sm:h-64 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="absolute inset-0 pointer-events-none">
          <WordWheelPixiRing
            selectedIndices={Array.from(usedIndices).map(idx => idx === 0 ? -1 : idx - 1)}
            radius={RADIUS_PX}
            combo={0}
            pointerPosRef={pointerPosRef}
            isDraggingRef={draggingRef}
          />
        </div>
        <WheelLetter
          letter={puzzle.center}
          isCenter
          index={0}
          isUsed={usedIndices.has(0)}
          onPress={onLetterPress}
        />
        {outerLetters.map((letter, i) => {
          const idx = i + 1;
          return (
            <WheelLetter
              key={`${letter}-${i}`}
              letter={letter}
              isCenter={false}
              index={idx}
              angle={i * (360 / outerLetters.length)}
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
          <m.div
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
                    ? 'bg-neo-cream/15 border-neo-cream/50 text-neo-white'
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
          </m.div>
        )}
      </AnimatePresence>

      {/* Built-word builder — uses real WordTile (tap to remove). Shakes
          horizontally on bad / missing-center feedback (real-game parity).
          Empty state shows a tap-or-drag hint so first-timers don't stare
          at a blank rectangle. */}
      <m.div
        className="flex items-end gap-1 min-h-[3rem]"
        data-testid="practice-built-word"
        animate={builderShake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {built.length === 0 && (
          <span className="text-neo-white font-neo-body text-xs italic">
            {t('practice.wheelRush.builderHint')}
          </span>
        )}
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
      </m.div>

      {/* Reset + Shuffle row — mirrors live WordWheelGame controls
          (RotateCcw + Shuffle icons, same neo-brutalist chrome). Visible
          always, sized for thumb reach without crowding the wheel. Stagger
          entrance keeps the controls feeling crafted on first paint. */}
      <div className="flex items-center justify-center gap-3" aria-label="wheel-controls">
        <m.button
          type="button"
          data-testid="practice-wheel-reset"
          onClick={handleReset}
          aria-label={t('practice.wheelRush.reset')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border-3 border-neo-black bg-neo-cream text-neo-navy shadow-hard active:translate-y-px active:shadow-hard-pressed disabled:opacity-50"
          disabled={built.length === 0}
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 360, damping: 22 }}
          whileTap={{ scale: 0.92 }}
        >
          <RotateCcw className="w-5 h-5" aria-hidden />
        </m.button>
        <m.button
          type="button"
          data-testid="practice-wheel-shuffle"
          onClick={handleShuffle}
          aria-label={t('practice.wheelRush.shuffle')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border-3 border-neo-black bg-neo-purple text-neo-white shadow-hard active:translate-y-px active:shadow-hard-pressed"
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 360, damping: 22 }}
          whileTap={{ scale: 0.92, rotate: 90 }}
        >
          <Shuffle className="w-5 h-5" aria-hidden />
        </m.button>
      </div>

      {/* Found words — last-found highlight matches real
          (WordWheelGame.tsx:951–985). */}
      <ul className="flex-shrink-0 flex flex-wrap gap-1.5 w-full max-h-[2.5rem] overflow-hidden">
        {foundWords.map((w, i) => {
          const isLast = i === foundWords.length - 1;
          return (
            <li
              key={w}
              className={
                'px-2 py-0.5 rounded border text-xs font-neo-display font-bold transition-colors ' +
                (isLast
                  ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                  : 'bg-neo-navy-light border-neo-black/40 text-neo-white')
              }
            >
              {w}
            </li>
          );
        })}
      </ul>

      {confettiKey > 0 && (
        <div data-testid="practice-confetti" className="absolute left-1/2 top-32 -translate-x-1/2 pointer-events-none">
          <InlineConfetti key={confettiKey} size="md" />
        </div>
      )}

      <WordFeedbackToast
        type={toast?.type ?? null}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

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
            className="absolute left-1/2 top-1/3 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-purple text-neo-white font-neo-display font-black text-base shadow-hard"
          >
            +{scorePopup.points} pts
          </m.div>
        )}
      </AnimatePresence>

      {/* Always-visible bailout — players must always have a one-tap escape
          to the real game, regardless of practice progress. */}
      <div className="mt-auto w-full">
        <Link
          href={`/${language}/daily/word-wheel`}
          data-testid="practice-bailout-cta"
          className="inline-flex items-center justify-center w-full bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]"
        >
          {t(isComplete ? 'practice.wordHunt.playRealCta' : 'practice.wordHunt.bailoutCta')}
        </Link>
      </div>

      <PracticeCompletePopup
        open={isComplete && !popupDismissed}
        mode="wheelRush"
        onDismiss={() => setPopupDismissed(true)}
      />
      <PracticePostCompleteChip open={isComplete && popupDismissed} mode="wheelRush" />
    </div>
  );
}
