'use client';

import type { PuzzleLocale } from '@/lib/crossword/types';
import { BackspaceKey, LetterKey } from './CrosswordKeyButton';
import { CrosswordKanaKeyboard } from './CrosswordKanaKeyboard';

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
  // ЙЦУКЕН without ё: normalizeRussianWord folds ё→е, so grids never hold ё.
  ru: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
};

export interface CrosswordKeyboardProps {
  locale: PuzzleLocale;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  backspaceLabel: string;
  /** ja only: labels for the base ↔ dakuten page toggle. */
  voicedLabel?: string;
  basicLabel?: string;
}

export function CrosswordKeyboard({
  locale,
  onLetter,
  onBackspace,
  disabled,
  backspaceLabel,
  voicedLabel = '゛゜',
  basicLabel = 'あ',
}: CrosswordKeyboardProps) {
  if (locale === 'ja') {
    return (
      <CrosswordKanaKeyboard
        onLetter={onLetter}
        onBackspace={onBackspace}
        disabled={disabled}
        backspaceLabel={backspaceLabel}
        voicedLabel={voicedLabel}
        basicLabel={basicLabel}
      />
    );
  }
  const rows = LAYOUTS[locale] ?? LAYOUTS.en!;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="flex flex-col gap-1.5 w-full max-w-[28rem] mx-auto select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {i === rows.length - 1 && (
            <BackspaceKey label={backspaceLabel} onPress={onBackspace} disabled={disabled} />
          )}
          {[...row].map((ch) => (
            <LetterKey key={ch} ch={ch} onPress={onLetter} disabled={disabled} />
          ))}
        </div>
      ))}
    </div>
  );
}
