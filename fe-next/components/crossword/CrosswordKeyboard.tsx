'use client';

import { Delete } from 'lucide-react';
import type { PuzzleLocale } from '@/lib/crossword/types';

const LAYOUTS: Partial<Record<PuzzleLocale, string[]>> = {
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  he: ['קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'],
  es: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'],
  sv: ['qwertyuiopå', 'asdfghjklöä', 'zxcvbnm'],
};

export interface CrosswordKeyboardProps {
  locale: PuzzleLocale;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  backspaceLabel: string;
  /** Letters that are fully used (all occurrences placed) — dimmed */
  usedLetters?: Set<string>;
  /** Letters that are correct in at least one position */
  correctLetters?: Set<string>;
  /** Letters that are wrong in all placed positions */
  wrongLetters?: Set<string>;
}

export function CrosswordKeyboard({
  locale,
  onLetter,
  onBackspace,
  disabled,
  backspaceLabel,
  usedLetters,
  correctLetters,
  wrongLetters,
}: CrosswordKeyboardProps) {
  const rows = LAYOUTS[locale] ?? LAYOUTS.en!;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  function keyClass(ch: string): string {
    const used = usedLetters?.has(ch);
    const correct = correctLetters?.has(ch);
    const wrong = wrongLetters?.has(ch);
    if (correct) return 'bg-neo-lime/30 text-neo-navy border-neo-lime/50';
    if (wrong) return 'bg-neo-red/30 text-neo-white/60 border-neo-red/50';
    if (used) return 'bg-neo-white/40 text-neo-navy/40 border-neo-black/30';
    return 'bg-neo-white text-neo-navy border-black';
  }

  return (
    <div dir={dir} className="flex flex-col gap-1.5 w-full max-w-[34rem] mx-auto select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {i === rows.length - 1 && (
            <button
              type="button"
              aria-label={backspaceLabel}
              disabled={disabled}
              onClick={onBackspace}
              className="flex items-center justify-center px-3 h-11 min-w-[2.75rem] bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40"
            >
              <Delete size={18} />
            </button>
          )}
          {[...row].map((ch) => {
            const cls = keyClass(ch);
            return (
              <button
                key={ch}
                type="button"
                disabled={disabled}
                onClick={() => onLetter(ch)}
                className={`flex-1 max-w-[2.4rem] h-11 font-neo-display font-bold uppercase border-neo rounded-neo shadow-hard active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40 transition-colors duration-150 ${cls}`}
              >
                {ch}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}