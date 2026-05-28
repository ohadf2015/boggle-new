'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

/**
 * Static mode-mechanic illustration (rewrite 2026-05-05).
 *
 * Was an infinite-repeat trail-dot loop ("auto-drag") + pulsing tiles, which
 * misled players into thinking the system would drag for them. Now: static
 * tiles + a one-shot fade-in arrow showing the path direction. No motion
 * loops, no auto-tracing — let the first manual drag be the real demo.
 *
 *  - classic / wordHunt: 2×2 mini-grid + dotted-arrow overlay
 *  - wheelRush: 6 outer letters around a center letter (60° apart)
 *
 * Letters are locale-aware (no Latin glyphs in HE/JA/ES). Hebrew has no
 * final-form letters (matches main game's letter pool).
 */
interface Props {
  mode: PracticeMode;
}

const COLOR_FOR_MODE: Record<PracticeMode, { tile: string }> = {
  classic: { tile: 'bg-neo-cyan/30 border-neo-cyan text-neo-white' },
  wordHunt: { tile: 'bg-neo-lime/30 border-neo-lime text-neo-white' },
  wheelRush: { tile: 'bg-neo-purple/30 border-neo-purple text-neo-white' },
};

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const asLocale = (lang: string): Locale =>
  (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'en';

// Wheel demo: center + 4 satellites for a compact preview (real game uses 6).
// Hebrew is finals-free.
const WHEEL_LETTERS: Record<Locale, { center: string; satellites: [string, string, string, string] }> = {
  en: { center: 'E', satellites: ['C', 'A', 'R', 'T'] },
  sv: { center: 'E', satellites: ['S', 'T', 'A', 'R'] },
  he: { center: 'י', satellites: ['ש', 'ל', 'ו', 'מ'] },
  ja: { center: 'い', satellites: ['ね', 'こ', 'と', 'り'] },
  es: { center: 'O', satellites: ['M', 'A', 'R', 'E'] },
};

// HE is finals-free (matches main letter pool). Tiles are decorative — we
// don't validate words against this 2×2 demo.
const GRID_LETTERS: Record<Locale, [string, string, string, string]> = {
  en: ['C', 'A', 'T', 'S'],
  sv: ['S', 'O', 'L', 'A'],
  he: ['ש', 'ל', 'ו', 'מ'],
  ja: ['ね', 'こ', 'と', 'り'],
  es: ['C', 'A', 'S', 'A'],
};

export default function PracticeMiniDemo({ mode }: Props) {
  const { language } = useLanguage();
  const locale = asLocale(language);
  const c = COLOR_FOR_MODE[mode];

  if (mode === 'wheelRush') {
    const { center, satellites } = WHEEL_LETTERS[locale];
    const RADIUS_PX = 44;
    return (
      <div className="relative w-32 h-32 mx-auto" aria-hidden>
        <span
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}
        >
          {center}
        </span>
        {satellites.map((letter, idx) => {
          const angle = idx * 90;
          return (
            <span
              key={`${letter}-${idx}`}
              className={`absolute top-1/2 left-1/2 w-9 h-9 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-base shadow-hard-sm`}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS_PX}px) rotate(${-angle}deg)`,
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
    );
  }

  // classic / wordHunt: 2×2 grid + a static dotted-arrow overlay (no auto-drag).
  const letters = GRID_LETTERS[locale];
  const tiles: Array<[string, [number, number]]> = [
    [letters[0], [0, 0]],
    [letters[1], [1, 0]],
    [letters[2], [1, 1]],
    [letters[3], [0, 1]],
  ];
  return (
    <div className="relative w-32 h-32 mx-auto" aria-hidden>
      {tiles.map(([letter, [x, y]], idx) => (
        <span
          key={`${letter}-${idx}`}
          className={`absolute w-12 h-12 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}
          style={{ left: `${x * 64 + 4}px`, top: `${y * 64 + 4}px` }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}
