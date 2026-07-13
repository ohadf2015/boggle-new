'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Stable letter-shuffle seeded by the answer string (no Math.random). */
function shuffleWord(word: string): string {
  const chars = word.split('');
  let seed = chars.reduce((s, c) => s + c.charCodeAt(0), 0);
  for (let i = chars.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const j = seed % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const result = chars.join('');
  // If shuffle is identical (1-char or degenerate), rotate by 1.
  if (result === word && word.length > 1) return word[1] + word.slice(2) + word[0];
  return result;
}

const TIMEOUT_S = 10;

interface ClueScrambleProps {
  answer: string;
  onResult: (solved: boolean) => void;
}

export function ClueScramble({ answer, onResult }: ClueScrambleProps) {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [remaining, setRemaining] = useState(TIMEOUT_S);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const scrambled = shuffleWord(answer.toUpperCase());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (success) return;
    if (remaining <= 0) {
      onResultRef.current(false);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, success]);

  function handleChange(val: string) {
    const upper = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(upper);
    if (upper === answer.toUpperCase()) {
      setSuccess(true);
      setTimeout(() => onResultRef.current(true), 380);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={() => onResultRef.current(false)}
    >
      <div
        className="bg-neo-navy border-neo-thick border-black rounded-t-neo sm:rounded-neo shadow-hard-lg w-full sm:w-80 sm:max-w-[90vw] px-5 pt-5 pb-7 sm:pb-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="font-neo-display font-bold text-neo-lime text-lg leading-none">
            {t('crossword.scramble.title')}
          </span>
          <span
            className={`font-neo-display font-bold text-lg tabular-nums leading-none transition-colors ${
              remaining <= 3 ? 'text-neo-red animate-pulse' : 'text-neo-white/50'
            }`}
          >
            {remaining}s
          </span>
        </div>

        {/* Scrambled letter tiles */}
        <div className="flex gap-1.5 justify-center flex-wrap">
          {scrambled.split('').map((ch, i) => (
            <span
              key={i}
              className="w-9 h-9 flex items-center justify-center bg-neo-navy-light border-neo border-black rounded-neo font-neo-display font-bold text-neo-cyan text-base shadow-hard-sm select-none"
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Answer input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          maxLength={answer.length}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full bg-neo-navy-light border-neo border-black rounded-neo px-3 py-2.5 font-neo-display font-bold text-center text-neo-white text-lg tracking-[0.25em] outline-none focus:border-neo-cyan transition-colors ${
            success ? 'border-neo-lime text-neo-lime' : ''
          }`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={success}
          aria-label={t('crossword.scramble.title')}
        />

        {/* Skip link */}
        {!success && (
          <button
            type="button"
            onClick={() => onResultRef.current(false)}
            className="w-full font-neo-body text-sm text-neo-white/40 hover:text-neo-white/70 transition-colors py-0.5"
          >
            {t('crossword.scramble.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
