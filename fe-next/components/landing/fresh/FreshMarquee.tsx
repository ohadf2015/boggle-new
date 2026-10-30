'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import s from './FreshReveal.module.css';

/** Sample found words per board language (ja plays romaji boards, like the game). */
const WORDS: Record<string, readonly string[]> = {
  en: ['CLASH', 'WORDS', 'RIVAL', 'COMBO', 'STREAK', 'PARTY', 'BLAST', 'QUIZ', 'VICTORY', 'GRID'],
  he: ['מילה', 'ניצחון', 'חברים', 'משחק', 'אתגר', 'קומבו', 'אותיות', 'מהיר', 'שיא', 'לוח'],
  sv: ['ORD', 'SPEL', 'VÄNNER', 'SEGER', 'KOMBO', 'SNABB', 'REKORD', 'RUTOR', 'UTMANING', 'BOKSTAV'],
  es: ['PALABRA', 'JUEGO', 'AMIGOS', 'VICTORIA', 'COMBO', 'RETO', 'LETRAS', 'RÁPIDO', 'RÉCORD', 'TABLERO'],
  ru: ['СЛОВО', 'ИГРА', 'ДРУЗЬЯ', 'ПОБЕДА', 'КОМБО', 'ВЫЗОВ', 'БУКВЫ', 'РЕКОРД', 'ДОСКА', 'СЕРИЯ'],
};

export function marqueeWords(language: string): readonly string[] {
  return WORDS[language] ?? WORDS.en;
}

/** Boggle-style points by length, the same ladder the game teaches. */
function points(word: string): number {
  const n = [...word].length;
  if (n <= 4) return 1;
  if (n === 5) return 2;
  if (n === 6) return 3;
  if (n === 7) return 5;
  return 11;
}

/** Complete literal classes per tone (Tailwind v4 only sees literals). */
const TONES = ['bg-neo-cream', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-pink'] as const;

function Run({ words, hidden }: { words: readonly string[]; hidden?: boolean }) {
  return (
    <ul data-marquee-run={hidden ? 'copy' : 'main'} className="flex shrink-0 items-center gap-6 pe-6 md:gap-10 md:pe-10">
      {words.map((word, w) => (
        <li key={word} data-marquee-word className={cn('relative flex items-end gap-1', s.marqueeWord)}>
          {[...word].map((ch, i) => (
            <span
              key={i}
              className={cn(
                'flex h-9 w-8 items-center justify-center rounded-[6px] border-2 border-neo-black font-neo-display text-lg font-bold leading-none text-neo-black shadow-hard-sm md:h-11 md:w-10 md:text-2xl',
                TONES[w % TONES.length],
                s.marqueeTile
              )}
            >
              {ch}
            </span>
          ))}
          {/* Black, not white: white on neo-purple is 4.23:1, under AA for 12px text. */}
          <span className="-ms-1 -mt-3 self-start rounded-neo-pill border-2 border-neo-black bg-neo-purple px-1.5 font-neo-display text-xs font-bold leading-5 text-neo-black shadow-hard-sm md:text-sm">
            +{points(word)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A tilted band of found words drifting under the hero: the game's raw
 * material at a glance. Decoration only (aria-hidden, no heading, no section
 * id); at rest it is a full static row, and the loop pauses on hover.
 */
export function FreshMarquee({ cross }: { cross?: boolean }) {
  const { language } = useLanguage();
  const all = marqueeWords(language);
  // The crossing band starts mid-list and runs the other way, so the two bands never read as one repeated strip.
  const words = cross ? [...all.slice(5), ...all.slice(0, 5)] : all;
  return (
    <div
      aria-hidden="true"
      data-fresh-marquee={cross ? 'cross' : ''}
      className={cn(
        'relative -mx-[4%] w-[108%] select-none overflow-hidden border-y-3 py-4 md:py-5',
        cross ? 'rotate-[1.5deg] border-neo-pink bg-neo-navy' : '-rotate-1 border-neo-cream/40 bg-neo-navy-light',
        s.marqueeBand
      )}
    >
      <div className={cn(s.marquee, cross && s.marqueeReverse)}>
        <Run words={words} />
        <Run words={words} hidden />
      </div>
    </div>
  );
}
