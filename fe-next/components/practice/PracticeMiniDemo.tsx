'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

/**
 * 1.5s loop showing the core mechanic per mode. CSS-only animation, no GIF assets.
 *  - classic / wordHunt: a 2×2 mini-grid with an animated drag path
 *  - wheelRush: 4 outer letters rotating around a center letter
 *
 * Letters are locale-aware so the demo never shows Latin glyphs in HE/JA/ES.
 * Satellite radius tuned so the wheel demo never overflows its w-32 box.
 */
interface Props {
  mode: PracticeMode;
}

const COLOR_FOR_MODE: Record<PracticeMode, { tile: string; path: string; ring: string }> = {
  classic: {
    tile: 'bg-neo-cyan/30 border-neo-cyan text-neo-cream',
    path: 'bg-neo-cyan',
    ring: 'border-neo-cyan/60',
  },
  wordHunt: {
    tile: 'bg-neo-lime/30 border-neo-lime text-neo-cream',
    path: 'bg-neo-lime',
    ring: 'border-neo-lime/60',
  },
  wheelRush: {
    tile: 'bg-neo-purple/30 border-neo-purple text-neo-cream',
    path: 'bg-neo-purple',
    ring: 'border-neo-purple/60',
  },
};

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const asLocale = (lang: string): Locale =>
  (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'en';

const WHEEL_LETTERS: Record<Locale, { center: string; satellites: [string, string, string, string] }> = {
  en: { center: 'E', satellites: ['C', 'A', 'R', 'T'] },
  sv: { center: 'E', satellites: ['S', 'T', 'A', 'R'] },
  he: { center: 'י', satellites: ['ש', 'ל', 'ו', 'ם'] },
  ja: { center: 'い', satellites: ['ね', 'こ', 'と', 'り'] },
  es: { center: 'O', satellites: ['M', 'A', 'R', 'E'] },
};

const GRID_LETTERS: Record<Locale, [string, string, string, string]> = {
  en: ['C', 'A', 'T', 'S'],
  sv: ['S', 'O', 'L', 'A'],
  he: ['ש', 'ל', 'ו', 'ם'],
  ja: ['ね', 'こ', 'と', 'り'],
  es: ['C', 'A', 'S', 'A'],
};

export default function PracticeMiniDemo({ mode }: Props) {
  const { language } = useLanguage();
  const locale = asLocale(language);
  const c = COLOR_FOR_MODE[mode];

  if (mode === 'wheelRush') {
    const { center, satellites } = WHEEL_LETTERS[locale];
    // Satellite radius capped at 44px (was 52) so the demo no longer overflows
    // its w-32 (128px) box on small breakpoints. Box half = 64px; radius 44 +
    // satellite half (18px) = 62px, leaves ~2px breathing room each side.
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
            <AdaptiveMotion.span
              key={`${letter}-${idx}`}
              className={`absolute top-1/2 left-1/2 w-9 h-9 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-base shadow-hard-sm`}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS_PX}px) rotate(${-angle}deg)`,
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.4, ease: 'easeInOut' }}
            >
              {letter}
            </AdaptiveMotion.span>
          );
        })}
      </div>
    );
  }

  // classic / wordHunt: 2×2 grid with drag-trail bar that slides through
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
        <AdaptiveMotion.span
          key={`${letter}-${idx}`}
          className={`absolute w-12 h-12 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}
          style={{ left: `${x * 64 + 4}px`, top: `${y * 64 + 4}px` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.35, ease: 'easeInOut' }}
        >
          {letter}
        </AdaptiveMotion.span>
      ))}
      {/* Trail dot following the path */}
      <AdaptiveMotion.span
        className={`absolute w-3 h-3 rounded-full ${c.path} shadow-hard-sm`}
        animate={{
          left: ['28px', '92px', '92px', '28px', '28px'],
          top: ['28px', '28px', '92px', '92px', '28px'],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
