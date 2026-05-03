'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { fireOnboardingBurst, fireVictoryConfetti } from '@/utils/confettiUtils';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import { normalizeWord } from '@/shared/utils/wordNormalization';

/**
 * Wheel mode practice. Same constraint as the real wheel: every word must
 * include the centre letter. Validation hits the real client-side dictionary
 * cache, so the player can find any real word — no curated allow-list.
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

export default function PracticeWheelSandbox() {
  const { language, t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();
  const { checkWord, isLoaded } = useDictionaryCache(language);
  const wheel = LETTERS[language] ?? LETTERS.en;

  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const [built, setBuilt] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'bad' | 'dup' | 'noCenter'; message: string } | null>(null);
  const celebratedRef = useRef(false);

  const currentWord = useMemo(() => built.join(''), [built]);
  const isComplete = foundWords.length >= GOAL;

  useEffect(() => {
    if (isComplete && !celebratedRef.current) {
      celebratedRef.current = true;
      markPracticeMode('wheelRush', language);
      fireVictoryConfetti();
    }
  }, [isComplete, language]);

  const addLetter = useCallback((letter: string) => {
    setFeedback(null);
    setBuilt((prev) => [...prev, letter]);
  }, []);

  const reset = useCallback(() => {
    setBuilt([]);
    setFeedback(null);
  }, []);

  const submit = useCallback(() => {
    if (currentWord.length < 3) return;
    if (!built.includes(wheel.center)) {
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
      fireOnboardingBurst({ x: 0.5, y: 0.45 });
    } else {
      setFeedback({ kind: 'bad', message: t('practice.wheelRush.notAWord') });
      playWordRejectedSound();
    }
  }, [built, currentWord, foundWords, wheel.center, t, language, isLoaded, checkWord, playWordAcceptedSound, playWordRejectedSound]);

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-4 pt-4 pb-bottom-stack flex flex-col items-center gap-3">
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

      <h1 className="text-base font-neo-display font-black text-neo-cream text-center max-w-md leading-tight">
        {isComplete ? t('practiceSwipe.done') : t('practice.wheelRush.instructionShort', { goal: GOAL })}
      </h1>

      <div className="relative w-56 h-56 mx-auto">
        {wheel.outer.map((letter, i) => {
          const angle = (i * (360 / wheel.outer.length) - 90) * (Math.PI / 180);
          const x = 96 * Math.cos(angle);
          const y = 96 * Math.sin(angle);
          return (
            <button
              key={`${letter}-${i}`}
              type="button"
              data-testid={`practice-wheel-outer-${i}`}
              onClick={() => addLetter(letter)}
              disabled={isComplete}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              }}
              className="w-14 h-14 rounded-full border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display font-black text-xl shadow-hard-sm active:scale-95 disabled:opacity-50"
            >
              {letter}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="practice-wheel-center"
          onClick={() => addLetter(wheel.center)}
          disabled={isComplete}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-2xl shadow-hard active:scale-95 disabled:opacity-50"
        >
          {wheel.center}
        </button>
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {currentWord}
      </div>

      <div className="flex gap-2 w-full max-w-md">
        <button
          type="button"
          onClick={submit}
          disabled={currentWord.length < 3 || isComplete}
          className="flex-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo py-2 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed disabled:opacity-50"
        >
          {t('practice.wheelRush.submit')}
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

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={
            'text-sm font-neo-body px-3 py-1.5 rounded-neo border-2 border-neo-black ' +
            (feedback.kind === 'ok'
              ? 'bg-neo-lime text-neo-black'
              : feedback.kind === 'dup' || feedback.kind === 'noCenter'
                ? 'bg-neo-yellow text-neo-black'
                : 'bg-neo-red text-neo-white')
          }
        >
          {feedback.message}
        </div>
      )}

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
