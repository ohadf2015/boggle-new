'use client';

import { Delete } from 'lucide-react';
import type { PuzzleLocale } from '@/lib/crossword/types';

const LAYOUTS: Partial<Record<PuzzleLocale, string[]>> = {
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  he: ['קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'],
};

export interface CrosswordKeyboardProps {
  locale: PuzzleLocale;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  backspaceLabel: string;
}

export function CrosswordKeyboard({
  locale,
  onLetter,
  onBackspace,
  disabled,
  backspaceLabel,
}: CrosswordKeyboardProps) {
  const rows = LAYOUTS[locale] ?? LAYOUTS.en!;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

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
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={disabled}
              onClick={() => onLetter(ch)}
              className="flex-1 max-w-[2.4rem] h-11 bg-neo-white text-neo-navy font-neo-display font-bold uppercase border-neo border-black rounded-neo shadow-hard active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40"
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
