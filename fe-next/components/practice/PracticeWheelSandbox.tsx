'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCoachTip from './PracticeCoachTip';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeModeNav from './PracticeModeNav';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

/**
 * Tiny curated wheel: 1 center + 4 outer letters. Center letter MUST appear
 * in every word — same rule as the real wheel mode but on a much smaller
 * surface so the player can grasp the constraint quickly.
 */
interface WheelPuzzle {
  center: string;
  outer: string[];
  validWords: ReadonlySet<string>;
}

const PUZZLES: Record<string, WheelPuzzle> = {
  en: {
    center: 'A',
    outer: ['T', 'R', 'C', 'E'],
    validWords: new Set(['CAR', 'CAT', 'RAT', 'ACE', 'CARE', 'RACE', 'TEAR', 'RATE', 'CRATE', 'REACT', 'ACT', 'ATE', 'EAR', 'EAT', 'ART', 'TAR']),
  },
  he: {
    center: 'א',
    outer: ['ב', 'ם', 'מ', 'ה'],
    // All entries must contain the center 'א'. Sandbox allows repeating an
    // outer letter (player can click it twice) — that's intentional, matches
    // real wheel mechanic.
    validWords: new Set(['אם', 'בא', 'אבא', 'אמא', 'אבה', 'מאה', 'אהבה']),
  },
  sv: {
    center: 'A',
    outer: ['T', 'R', 'K', 'E'],
    validWords: new Set(['ATT', 'ARK', 'AKTE', 'TAR', 'TEA', 'RAT', 'ART']),
  },
  ja: {
    center: 'い',
    // Outer chosen so every word in validWords actually contains the center 'い'
    // (previous outer included ね/こ which let through 'ねこ' violating the rule).
    outer: ['ぬ', 'と', 'け', 'ま'],
    validWords: new Set(['いぬ', 'いと', 'いけ', 'いま', 'けい', 'まい']),
  },
  es: {
    center: 'A',
    outer: ['C', 'S', 'M', 'E'],
    // Every entry must include the center 'A'. MES/CAS removed — no A.
    validWords: new Set(['CASA', 'AME', 'MASA', 'SACA', 'AMA', 'MAS', 'ASA', 'CASE']),
  },
};

export default function PracticeWheelSandbox() {
  const { language, t } = useLanguage();
  const puzzle = PUZZLES[language] ?? PUZZLES.en;

  const [built, setBuilt] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'bad' | 'dup' | 'noCenter'; message: string } | null>(null);

  const startedAtRef = useRef<number>(0);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
  }, [language]);

  useEffect(() => {
    if (foundWords.length >= PRACTICE_GOALS.wheelRush && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wheelRush', language);
      trackPracticeCompleted({
        mode: 'wheelRush',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
    }
  }, [foundWords.length, language]);
  const isComplete = foundWords.length >= PRACTICE_GOALS.wheelRush;

  const currentWord = useMemo(() => built.join(''), [built]);

  const addLetter = useCallback((letter: string) => {
    setFeedback(null);
    setBuilt((prev) => [...prev, letter]);
  }, []);

  const reset = useCallback(() => {
    setBuilt([]);
    setFeedback(null);
  }, []);

  const submit = useCallback(() => {
    if (currentWord.length < 2) return;
    if (!built.includes(puzzle.center)) {
      setFeedback({ kind: 'noCenter', message: t('practice.wheelRush.needsCenter') });
      return;
    }
    const upper = currentWord.toUpperCase();
    if (foundWords.includes(upper)) {
      setFeedback({ kind: 'dup', message: t('practice.wheelRush.duplicate') });
      return;
    }
    const hit = puzzle.validWords.has(upper) || puzzle.validWords.has(currentWord);
    if (hit) {
      setFoundWords((prev) => {
        const next = [...prev, upper];
        trackPracticeWordFound({
          mode: 'wheelRush',
          locale: language,
          word: upper,
          wordsFound: next.length,
        });
        return next;
      });
      setFeedback({ kind: 'ok', message: t('practice.wheelRush.found') });
      setBuilt([]);
    } else {
      setFeedback({ kind: 'bad', message: t('practice.wheelRush.notAWord') });
    }
  }, [built, currentWord, foundWords, puzzle, t, language]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3">
      <PracticeModeNav current="wheelRush" />
      <PracticeCoachTip mode="wheelRush" wordsFound={foundWords.length} />

      <p className="text-neo-cream/80 text-sm text-center font-neo-body">
        {t('practice.wheelRush.instruction')}
      </p>

      <div className="relative w-56 h-56 mx-auto">
        {/* Outer ring positioned at 4 cardinal points */}
        {puzzle.outer.map((letter, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = 96 * Math.cos(angle);
          const y = 96 * Math.sin(angle);
          return (
            <button
              key={`${letter}-${i}`}
              type="button"
              data-testid={`practice-wheel-outer-${i}`}
              onClick={() => addLetter(letter)}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              }}
              className="w-14 h-14 rounded-full border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display font-black text-xl shadow-hard-sm active:scale-95"
            >
              {letter}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="practice-wheel-center"
          onClick={() => addLetter(puzzle.center)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-2xl shadow-hard active:scale-95"
        >
          {puzzle.center}
        </button>
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {currentWord}
      </div>

      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={submit}
          disabled={currentWord.length < 2}
          className="flex-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo py-2 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed disabled:opacity-50"
        >
          {t('practice.wheelRush.submit')}
        </button>
        <button
          type="button"
          onClick={reset}
          className="bg-neo-navy-light text-neo-cream border-2 border-neo-cream/30 rounded-neo px-3 py-2 font-neo-display font-black text-sm"
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

      <div className="w-full">
        <p className="text-neo-cream/60 text-xs uppercase font-neo-display font-black mb-1">
          {t('practice.wheelRush.foundWordsLabel', { count: foundWords.length })}
        </p>
        <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {foundWords.map((w) => (
            <li
              key={w}
              className="px-2 py-0.5 bg-neo-lime/20 border border-neo-lime/40 rounded text-neo-lime text-xs font-neo-display font-bold"
            >
              {w}
            </li>
          ))}
        </ul>
      </div>

      {isComplete && <PracticeCompleteBanner mode="wheelRush" />}

      <PracticeChainCta currentMode="wheelRush" className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed" />
    </div>
  );
}
