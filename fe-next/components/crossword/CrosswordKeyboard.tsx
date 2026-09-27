'use client';

import { Delete } from 'lucide-react';
import type { PuzzleLocale } from '@/lib/crossword/types';

const LAYOUTS: Partial<Record<PuzzleLocale, string[]>> = {
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  // Standard Israeli layout MINUS the five final forms (ךםןףץ). Crossword answers are stored in
  // regular form — no answer in clueBank.he.json contains a sofit — and normalizeCell folds a typed
  // sofit back to its regular letter, so those keys could only ever produce the letter next to them.
  // Dropping them removes five dead keys and lets the remaining ones grow (10→9 and 9→7 per row).
  // Final forms are still RENDERED at word ends by answer.displayLetter; this is input only.
  he: ['קראטופ', 'שדגכעיחל', 'זסבהנמצת'],
  // Spanish keyboard = QWERTY + ñ. Grids are accent-folded (see answer.foldEsAccents) so no
  // accented vowel keys are needed; ñ is a distinct letter and must be typeable.
  es: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'],
  // Swedish keyboard = QWERTY + å/ä/ö (distinct Swedish letters, appended to the home/top rows).
  sv: ['qwertyuiopå', 'asdfghjklöä', 'zxcvbnm'],
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
    <div dir={dir} className="flex flex-col gap-1.5 w-full max-w-[28rem] mx-auto select-none">
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
