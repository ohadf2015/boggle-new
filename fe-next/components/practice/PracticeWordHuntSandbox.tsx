'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCoachTip from './PracticeCoachTip';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

/**
 * Curated target word + tile pool per locale. Pool deliberately includes the
 * target letters plus a few decoys so the player must think about ordering,
 * not just sequence-press. Hand-picked to be solvable on the first or second
 * try once the coach tip is read.
 */
interface PracticePuzzle {
  target: string;
  pool: string[];
}

const PUZZLES: Record<string, PracticePuzzle> = {
  en: { target: 'STAR', pool: ['S', 'T', 'A', 'R', 'O', 'E'] },
  he: { target: 'שלום', pool: ['ש', 'ל', 'ו', 'ם', 'א', 'ב'] },
  sv: { target: 'STOL', pool: ['S', 'T', 'O', 'L', 'A', 'E'] },
  ja: { target: 'いぬ', pool: ['い', 'ぬ', 'ね', 'こ', 'と', 'り'] },
  es: { target: 'CASA', pool: ['C', 'A', 'S', 'A', 'O', 'E'] },
};

type LetterFeedback = 'correct' | 'present' | 'absent';

const scoreGuess = (guess: string, target: string): LetterFeedback[] => {
  const result: LetterFeedback[] = guess.split('').map(() => 'absent');
  const targetChars = target.split('');
  const used = new Set<number>();
  // First pass — exact matches.
  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === targetChars[i]) {
      result[i] = 'correct';
      used.add(i);
    }
  }
  // Second pass — present (right letter, wrong slot).
  for (let i = 0; i < guess.length; i += 1) {
    if (result[i] === 'correct') continue;
    const idx = targetChars.findIndex((c, j) => c === guess[i] && !used.has(j));
    if (idx !== -1) {
      result[i] = 'present';
      used.add(idx);
    }
  }
  return result;
};

interface Attempt { guess: string; feedback: LetterFeedback[] }

export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  const puzzle = PUZZLES[language] ?? PUZZLES.en;
  const target = puzzle.target;

  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solved, setSolved] = useState(false);

  const startedAtRef = useRef<number>(0);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wordHunt', locale: language });
  }, [language]);

  useEffect(() => {
    if (solved && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wordHunt', language);
      trackPracticeCompleted({
        mode: 'wordHunt',
        locale: language,
        wordsFound: 1,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
    }
  }, [solved, language]);

  const targetLength = useMemo(() => Array.from(target).length, [target]);

  const addLetter = useCallback((letter: string) => {
    if (solved) return;
    setGuess((prev) => (Array.from(prev).length >= targetLength ? prev : prev + letter));
  }, [solved, targetLength]);

  const backspace = useCallback(() => {
    setGuess((prev) => Array.from(prev).slice(0, -1).join(''));
  }, []);

  const submit = useCallback(() => {
    if (Array.from(guess).length !== targetLength) return;
    const feedback = scoreGuess(guess, target);
    setAttempts((prev) => [...prev, { guess, feedback }]);
    if (guess === target) setSolved(true);
    setGuess('');
  }, [guess, target, targetLength]);

  // Last attempt's feedback array tells us if the player just guessed wrong
  // (no slot was 'correct'). Used only for mascot mood; doesn't change game.
  const lastAttempt = attempts[attempts.length - 1];
  const lastWasWrong =
    !solved && !!lastAttempt && lastAttempt.feedback.every((f) => f !== 'correct');
  const mascotReaction: PracticeMascotMood = solved
    ? 'celebrate'
    : lastWasWrong
      ? 'wrong'
      : 'idle';

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3">
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />
      <PracticeModeNav current="wordHunt" />
      <PracticeCoachTip mode="wordHunt" wordsFound={solved ? 1 : 0} />

      <p className="text-neo-cream/80 text-sm text-center font-neo-body">
        {t('practice.wordHunt.instruction')}
      </p>

      <div
        data-testid="practice-target"
        className="flex flex-col items-center gap-1"
      >
        <span className="text-[10px] uppercase font-neo-display font-black text-neo-cream/60 tracking-wider">
          {t('practice.wordHunt.targetLabel')}
        </span>
        <div className="flex gap-1.5 items-center justify-center font-neo-display font-black">
          {Array.from(target).map((letter, i) => (
            <span
              key={i}
              className={
                'w-8 h-10 flex items-center justify-center text-2xl border-b-3 ' +
                (solved
                  ? 'text-neo-lime border-neo-lime'
                  : 'text-neo-cream border-neo-cream/40')
              }
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      <ul className="w-full flex flex-col gap-1 min-h-[2rem]">
        {attempts.map((a, idx) => (
          <li key={idx} className="flex gap-1 justify-center">
            {Array.from(a.guess).map((letter, j) => (
              <span
                key={j}
                className={
                  'w-8 h-8 flex items-center justify-center font-neo-display font-black text-sm border-2 border-neo-black rounded-sm ' +
                  (a.feedback[j] === 'correct'
                    ? 'bg-neo-lime text-neo-black'
                    : a.feedback[j] === 'present'
                      ? 'bg-neo-yellow text-neo-black'
                      : 'bg-neo-navy-light text-neo-cream/60')
                }
              >
                {letter}
              </span>
            ))}
          </li>
        ))}
      </ul>

      <div
        data-testid="practice-current-guess"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {guess}
      </div>

      <div className="grid grid-cols-6 gap-1.5 w-full max-w-xs">
        {puzzle.pool.map((letter, i) => (
          <button
            key={`${letter}-${i}`}
            type="button"
            data-testid={`practice-letter-${i}`}
            onClick={() => addLetter(letter)}
            disabled={solved}
            className="aspect-square rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display font-black text-lg shadow-hard-sm active:scale-95 disabled:opacity-50"
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={submit}
          disabled={solved || Array.from(guess).length !== targetLength}
          className="flex-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo py-2 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed disabled:opacity-50"
        >
          {t('practice.wordHunt.submit')}
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={solved || guess.length === 0}
          className="bg-neo-navy-light text-neo-cream border-2 border-neo-cream/30 rounded-neo px-3 py-2 font-neo-display font-black text-sm disabled:opacity-50"
        >
          {t('practice.wordHunt.backspace')}
        </button>
      </div>

      {solved && (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-1.5 bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo font-neo-body text-sm"
        >
          {t('practice.wordHunt.solved')}
        </div>
      )}

      {solved && <PracticeCompleteBanner mode="wordHunt" />}

      <PracticeChainCta currentMode="wordHunt" className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed" />
    </div>
  );
}
