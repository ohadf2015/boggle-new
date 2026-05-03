'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { Mascot } from '@/components/ui/Mascot';
import { fireOnboardingBurst, fireVictoryConfetti } from '@/utils/confettiUtils';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import { normalizeWord } from '@/shared/utils/wordNormalization';

/**
 * Wheel mode practice. Same constraint as the real wheel: every word must
 * include the centre letter. Validation hits the real client-side dictionary
 * cache. Adds the real-game UX bits: tap-toggle to add/remove a letter,
 * drag through letters to build, and a shuffle button — but no timer.
 */
interface WheelLetters {
  center: string;
  outer: string[];
}

const LETTERS: Record<string, WheelLetters> = {
  en: { center: 'A', outer: ['T', 'R', 'C', 'E', 'S'] },
  he: { center: 'א', outer: ['ב', 'ם', 'מ', 'ה', 'ר'] },
  sv: { center: 'A', outer: ['T', 'R', 'K', 'E', 'S'] },
  ja: { center: 'い', outer: ['ぬ', 'と', 'け', 'ま', 'り'] },
  es: { center: 'A', outer: ['C', 'S', 'M', 'E', 'L'] },
};

const GOAL = PRACTICE_GOALS.wheelRush;
const MIN_LEN = 2;

interface BuiltLetter {
  letter: string;
  /** -1 for centre, 0..n-1 for outer index */
  source: number;
}

export default function PracticeWheelSandbox() {
  const { language, t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive, playButtonClickSound, playBoardShuffleSound } = useSoundEffects();
  const { checkWord, isLoaded } = useDictionaryCache(language);
  const baseWheel = LETTERS[language] ?? LETTERS.en;

  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const [outer, setOuter] = useState<string[]>(baseWheel.outer);
  const [built, setBuilt] = useState<BuiltLetter[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'bad' | 'dup' | 'noCenter' | 'tooShort'; message: string } | null>(null);
  const [pop, setPop] = useState<{ id: number; word: string; label: string } | null>(null);
  const popIdRef = useRef(0);
  const celebratedRef = useRef(false);

  const currentWord = useMemo(() => built.map((b) => b.letter).join(''), [built]);
  const isComplete = foundWords.length >= GOAL;

  useEffect(() => {
    if (isComplete && !celebratedRef.current) {
      celebratedRef.current = true;
      markPracticeMode('wheelRush', language);
      fireVictoryConfetti();
    }
  }, [isComplete, language]);

  const addLetter = useCallback(
    (letter: string, source: number) => {
      if (isComplete) return;
      setFeedback(null);
      // Toggle: if this exact source is already in built, remove it
      setBuilt((prev) => {
        const existingIdx = prev.findIndex((b) => b.source === source);
        if (existingIdx !== -1) {
          return prev.filter((_, i) => i !== existingIdx);
        }
        return [...prev, { letter, source }];
      });
      playButtonClickSound();
      haptics.tap();
    },
    [isComplete, playButtonClickSound],
  );

  const reset = useCallback(() => {
    setBuilt([]);
    setFeedback(null);
  }, []);

  const shuffle = useCallback(() => {
    if (isComplete) return;
    setOuter((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      // Remap built letters: keep centre, drop outer (positions changed)
      setBuilt((b) => b.filter((bl) => bl.source === -1));
      return arr;
    });
    playBoardShuffleSound();
    haptics.tap();
  }, [isComplete, playBoardShuffleSound]);

  const submit = useCallback(() => {
    if (currentWord.length < MIN_LEN) {
      setFeedback({ kind: 'tooShort', message: t('practice.wheelRush.tooShort') });
      return;
    }
    if (!built.some((b) => b.source === -1)) {
      setFeedback({ kind: 'noCenter', message: t('practice.wheelRush.needsCenter') });
      playWordRejectedSound();
      return;
    }
    const normalized = normalizeWord(currentWord, language).toLowerCase();
    if (foundWords.includes(normalized)) {
      setFeedback({ kind: 'dup', message: t('practice.wheelRush.duplicate') });
      return;
    }
    if (!isLoaded) return;
    if (checkWord(normalized)) {
      setFoundWords((prev) => [...prev, normalized]);
      setFeedback({ kind: 'ok', message: t('practice.wheelRush.found') });
      setBuilt([]);
      playWordAcceptedSound();
      haptics.success();
      const labels = [
        t('practiceSwipe.celebrate1'),
        t('practiceSwipe.celebrate2'),
        t('practiceSwipe.celebrate3'),
        t('practiceSwipe.celebrate4'),
      ];
      popIdRef.current += 1;
      setPop({
        id: popIdRef.current,
        word: normalized.toUpperCase(),
        label: labels[Math.floor(Math.random() * labels.length)],
      });
      setTimeout(() => {
        setPop((cur) => (cur && cur.id === popIdRef.current ? null : cur));
      }, 900);
      fireOnboardingBurst({ x: 0.5, y: 0.45 });
    } else {
      setFeedback({ kind: 'bad', message: t('practice.wheelRush.notAWord') });
      playWordRejectedSound();
    }
  }, [built, currentWord, foundWords, t, language, isLoaded, checkWord, playWordAcceptedSound, playWordRejectedSound]);

  // ── drag-to-build ────────────────────────────────────────────────
  const draggingRef = useRef(false);
  const lastSourceRef = useRef<number | null>(null);

  const tryDragHit = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const btn = el?.closest<HTMLButtonElement>('[data-wheel-source]');
      if (!btn) return;
      const source = Number(btn.dataset.wheelSource);
      if (source === lastSourceRef.current) return;
      lastSourceRef.current = source;
      const letter = btn.dataset.wheelLetter || '';
      addLetter(letter, source);
    },
    [addLetter],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    lastSourceRef.current = null;
    tryDragHit(e.clientX, e.clientY);
  }, [tryDragHit]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      tryDragHit(e.clientX, e.clientY);
    },
    [tryDragHit],
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    lastSourceRef.current = null;
    if (built.length >= MIN_LEN) submit();
  }, [built.length, submit]);

  const mascotVariant = isComplete ? 'celebration' : 'dj';

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-4 pt-3 pb-bottom-stack flex flex-col items-center gap-3">
      <div className="w-full max-w-md flex items-center justify-between">
        <Link
          href={`/${language}/practice`}
          className="text-xs font-neo-display font-black text-neo-cream/60 hover:text-neo-cream"
        >
          {t('practiceSwipe.back')}
        </Link>
        <div
          aria-label={t('practiceSwipe.progress', { found: foundWords.length, goal: GOAL })}
          className="flex items-center gap-1.5"
        >
          {Array.from({ length: GOAL }).map((_, i) => (
            <span
              key={i}
              className={
                'w-3 h-3 rounded-full border-2 border-neo-black ' +
                (i < foundWords.length ? 'bg-neo-purple' : 'bg-neo-navy')
              }
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md flex items-center gap-2">
        <Mascot variant={mascotVariant} size="xs" clipShape="circle" clipBorder="purple" />
        <div className="relative flex-1 bg-neo-purple text-neo-white border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm">
          <p className="text-xs font-neo-display font-black uppercase tracking-wide leading-tight">
            {t('practiceSwipe.wheelGreet')}
          </p>
          <p className="text-sm font-neo-body font-bold leading-tight">
            {isComplete ? t('practiceSwipe.done') : t('practice.wheelRush.instructionShort', { goal: GOAL })}
          </p>
        </div>
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2.25rem] font-neo-display font-black text-2xl text-neo-cream tracking-widest"
      >
        {currentWord}
      </div>

      <div
        className="relative w-60 h-60 mx-auto select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {outer.map((letter, i) => {
          const angle = (i * (360 / outer.length) - 90) * (Math.PI / 180);
          const x = 100 * Math.cos(angle);
          const y = 100 * Math.sin(angle);
          const isUsed = built.some((b) => b.source === i);
          return (
            <button
              key={`${letter}-${i}`}
              type="button"
              data-testid={`practice-wheel-outer-${i}`}
              data-wheel-source={i}
              data-wheel-letter={letter}
              onClick={() => addLetter(letter, i)}
              disabled={isComplete}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              }}
              className={
                'w-14 h-14 rounded-full border-2 border-neo-black font-neo-display font-black text-xl shadow-hard-sm active:scale-95 disabled:opacity-50 transition-colors ' +
                (isUsed ? 'bg-neo-purple text-neo-white' : 'bg-neo-cream text-neo-black')
              }
            >
              {letter}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="practice-wheel-center"
          data-wheel-source={-1}
          data-wheel-letter={baseWheel.center}
          onClick={() => addLetter(baseWheel.center, -1)}
          disabled={isComplete}
          className={
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-3 border-neo-black font-neo-display font-black text-2xl shadow-hard active:scale-95 disabled:opacity-50 transition-colors ' +
            (built.some((b) => b.source === -1) ? 'bg-neo-lime/80 text-neo-black' : 'bg-neo-lime text-neo-black')
          }
        >
          {baseWheel.center}
        </button>
      </div>

      <div className="flex gap-2 w-full max-w-md">
        <button
          type="button"
          onClick={submit}
          disabled={currentWord.length < MIN_LEN || isComplete}
          className="flex-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo py-2 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed disabled:opacity-50"
        >
          {t('practice.wheelRush.submit')}
        </button>
        <button
          type="button"
          onClick={shuffle}
          disabled={isComplete}
          aria-label={t('practiceSwipe.wheelShuffle')}
          className="bg-neo-pink text-neo-white border-2 border-neo-black rounded-neo px-3 py-2 font-neo-display font-black text-sm shadow-hard-sm disabled:opacity-50"
        >
          <Shuffle className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={isComplete}
          className="bg-neo-navy-light text-neo-cream border-2 border-neo-cream/30 rounded-neo px-3 py-2 font-neo-display font-black text-sm disabled:opacity-50"
        >
          {t('practice.wheelRush.reset')}
        </button>
      </div>

      <div className="relative w-full max-w-md min-h-[2rem] flex justify-center">
        {feedback && !pop && (
          <div
            role="status"
            aria-live="polite"
            className={
              'text-sm font-neo-body px-3 py-1.5 rounded-neo border-2 border-neo-black ' +
              (feedback.kind === 'ok'
                ? 'bg-neo-lime text-neo-black'
                : feedback.kind === 'dup' || feedback.kind === 'noCenter' || feedback.kind === 'tooShort'
                  ? 'bg-neo-yellow text-neo-black'
                  : 'bg-neo-red text-neo-white')
            }
          >
            {feedback.message}
          </div>
        )}
        <AnimatePresence>
          {pop && (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -30 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="absolute pointer-events-none z-10 bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo px-4 py-1.5 shadow-hard"
            >
              <span className="font-neo-display font-black text-base uppercase tracking-wide">
                {pop.label}
              </span>
              <span className="block text-xs font-neo-body font-bold opacity-90 text-center">
                +{pop.word}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {foundWords.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 justify-center max-w-md">
          {foundWords.map((w) => (
            <li
              key={w}
              className="px-2 py-0.5 rounded text-xs font-neo-display font-bold border border-neo-purple/60 text-neo-purple bg-neo-navy-light"
            >
              {w.toUpperCase()}
            </li>
          ))}
        </ul>
      )}

      {isComplete && (
        <Link
          href={`/${language}/practice`}
          data-testid="practice-continue-cta"
          className="mt-2 inline-flex items-center justify-center w-full max-w-md bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        >
          {t('practiceSwipe.continue')}
        </Link>
      )}
    </div>
  );
}
