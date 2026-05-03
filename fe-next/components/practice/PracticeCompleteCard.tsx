'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Mascot, type MascotVariant } from '@/components/ui/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  words: string[];
  locale: string;
  onPlayAgain: () => void;
}

const MASCOT: Record<PracticeMode, MascotVariant> = {
  classic: 'celebration',
  wordHunt: 'flexing',
  wheelRush: 'celebration',
};

const ACCENT: Record<PracticeMode, { ring: string; pill: string; bar: string; chip: string }> = {
  classic: {
    ring: 'border-neo-cyan',
    pill: 'bg-neo-cyan',
    bar: 'from-neo-cyan via-neo-lime to-neo-pink',
    chip: 'border-neo-cyan/60 text-neo-cyan',
  },
  wordHunt: {
    ring: 'border-neo-lime',
    pill: 'bg-neo-lime',
    bar: 'from-neo-lime via-neo-cyan to-neo-pink',
    chip: 'border-neo-lime/60 text-neo-lime',
  },
  wheelRush: {
    ring: 'border-neo-purple',
    pill: 'bg-neo-purple text-neo-white',
    bar: 'from-neo-purple via-neo-pink to-neo-yellow',
    chip: 'border-neo-purple/60 text-neo-purple',
  },
};

const CLIP_BORDER: Record<PracticeMode, 'cyan' | 'lime' | 'purple'> = {
  classic: 'cyan',
  wordHunt: 'lime',
  wheelRush: 'purple',
};

/**
 * Celebration card shown after the player crosses a practice mode's goal.
 * Mascot, complimentary copy, mini stats, and twin CTAs (try again / continue).
 * Reuses the real game's complimentary tone — no XP/score noise.
 */
export default function PracticeCompleteCard({ mode, words, locale, onPlayAgain }: Props) {
  const { t, language } = useLanguage();
  const accent = ACCENT[mode];

  const stats = useMemo(() => {
    const count = words.length;
    let longest = '';
    for (const w of words) {
      if (w.length > longest.length) longest = w;
    }
    const totalLetters = words.reduce((acc, w) => acc + w.length, 0);
    const display = longest
      ? language === 'he'
        ? applyHebrewFinalLetters(longest.toUpperCase())
        : longest.toUpperCase()
      : t('practiceSwipe.complete.noLongest');
    return { count, totalLetters, longest: display };
  }, [words, language, t]);

  // Pick a praise line deterministically per session — keeps the moment fresh
  // without being random on each render.
  const praise = useMemo(() => {
    const keys = ['praise1', 'praise2', 'praise3', 'praise4'] as const;
    const idx = Math.floor(Math.random() * keys.length);
    return t(`practiceSwipe.complete.${keys[idx]}`);
  }, [t]);

  const subtitleKey =
    mode === 'wordHunt'
      ? 'practiceSwipe.complete.subtitleWordHunt'
      : mode === 'wheelRush'
        ? 'practiceSwipe.complete.subtitleWheelRush'
        : 'practiceSwipe.complete.subtitleClassic';

  return (
    <AdaptiveMotion.div
      data-testid="practice-complete-card"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`w-full max-w-md rounded-neo border-3 ${accent.ring} bg-neo-cream text-neo-black shadow-hard overflow-hidden`}
    >
      <div className={`bg-linear-to-r ${accent.bar} h-2 w-full`} />
      <div className="px-4 pt-3 pb-4 flex flex-col items-center text-center gap-2">
        <Mascot
          variant={MASCOT[mode]}
          size="md"
          clipShape="circle"
          clipBorder={CLIP_BORDER[mode]}
        />
        <h2 className="font-neo-display font-black text-2xl uppercase tracking-tight leading-none">
          {t('practiceSwipe.complete.title')}
        </h2>
        <p className="font-neo-body font-bold text-sm leading-snug">
          {t(subtitleKey)}
        </p>
        <span
          className={`mt-1 inline-block ${accent.pill} text-neo-black border-2 border-neo-black rounded-full px-3 py-1 font-neo-display font-black text-xs uppercase tracking-wider shadow-hard-sm`}
        >
          {praise}
        </span>

        <div className="mt-3 grid grid-cols-3 gap-2 w-full">
          <Stat label={t('practiceSwipe.complete.statsWords')} value={String(stats.count)} chip={accent.chip} />
          <Stat label={t('practiceSwipe.complete.statsLongest')} value={stats.longest} chip={accent.chip} />
          <Stat label={t('practiceSwipe.complete.statsLetters')} value={String(stats.totalLetters)} chip={accent.chip} />
        </div>

        <div className="mt-4 w-full flex flex-col gap-2">
          <Link
            href={`/${locale}/practice`}
            data-testid="practice-continue-cta"
            className="inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
          >
            {t('practiceSwipe.tryAnother')}
          </Link>
          <button
            type="button"
            onClick={onPlayAgain}
            data-testid="practice-play-again-cta"
            className="inline-flex items-center justify-center w-full bg-neo-navy-light text-neo-cream border-2 border-neo-cream/30 rounded-neo py-2 px-4 font-neo-display font-black text-sm hover:bg-neo-navy"
          >
            {t('practiceSwipe.playAgain')}
          </button>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}

function Stat({ label, value, chip }: { label: string; value: string; chip: string }) {
  return (
    <div className={`rounded-neo border-2 ${chip} bg-neo-navy/95 px-2 py-2 flex flex-col items-center gap-0.5`}>
      <span className="text-[10px] uppercase tracking-wider font-neo-body font-bold opacity-80">
        {label}
      </span>
      <span className="font-neo-display font-black text-base leading-none truncate max-w-full">
        {value}
      </span>
    </div>
  );
}
