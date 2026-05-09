'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import PracticeStreakChip from '@/components/practice/PracticeStreakChip';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const MODE_ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan/80 hover:border-neo-cyan',
  wordHunt: 'border-neo-lime/80 hover:border-neo-lime',
  wheelRush: 'border-neo-purple/80 hover:border-neo-purple',
};

// Per-mode tinted background — gentle color wash that hints at the mode
// theme without competing with the hero thumbnail's saturated palette.
const MODE_TINT: Record<PracticeMode, string> = {
  classic: 'bg-linear-to-br from-neo-navy-light to-neo-cyan/5',
  wordHunt: 'bg-linear-to-br from-neo-navy-light to-neo-lime/5',
  wheelRush: 'bg-linear-to-br from-neo-navy-light to-neo-purple/5',
};

// Hero thumbnails — same images as the tutorial help modal so visual
// language is consistent across hub → tutorial → in-game help.
const MODE_HERO: Record<PracticeMode, string> = {
  classic: '/practice/help/practice-help-classic.png',
  wordHunt: '/practice/help/practice-help-wordhunt.png',
  wheelRush: '/practice/help/practice-help-wheelrush.png',
};

// Friendly emoji per mode — adds personality to the headers without
// hardcoding strings into translations.
const MODE_EMOJI: Record<PracticeMode, string> = {
  classic: '✏️',
  wordHunt: '🔍',
  wheelRush: '🎡',
};

interface Props {
  locale: string;
}

/**
 * Cozy practice hub. One mode per row, breathing accents, no badges or
 * counters. Tap → /practice/<mode> which shows the intro card.
 */
export default function PracticeHubClient({ locale }: Props) {
  const { t, language } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
  const completed = usePracticeProgress(language);
  const handleTileTap = () => {
    playButtonClickSound();
    haptics.tap();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-5 py-5 sm:py-8">
      <div className="max-w-md mx-auto">
        <PendingRoomBanner locale={locale} />
        {/* Compact header: title row + progress chips inline. Was two stacked
            blocks (~140px) consuming a quarter of the small-viewport budget;
            now ~64px, leaving room for the three mode tiles without scroll. */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-4 flex items-center justify-between gap-3"
        >
          <h1 className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-cream flex items-center gap-2">
            <AdaptiveMotion.span
              aria-hidden
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
            >
              ✨
            </AdaptiveMotion.span>
            <span>{t('practiceHub.title')}</span>
          </h1>
          <div
            data-testid="practice-progress-headline"
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-neo-navy/60 border border-neo-lime/40 text-[0.65rem] uppercase tracking-wider font-neo-display font-black text-neo-lime"
          >
            <span aria-hidden>★</span>
            <span>{t('practiceHub.progress', { done: completed.size, total: PRACTICE_MODES.length })}</span>
          </div>
        </AdaptiveMotion.div>

        <div className="mb-4 flex justify-center">
          <PracticeStreakChip />
        </div>

        {completed.size === PRACTICE_MODES.length && (
          <AdaptiveMotion.div
            data-testid="practice-all-complete"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="mb-6 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard text-center"
          >
            <p className="font-neo-display font-black text-base mb-0.5">
              {t('practiceHub.allCompleteTitle')}
            </p>
            <p className="font-neo-body text-xs">
              {t('practiceHub.allCompleteBody')}
            </p>
          </AdaptiveMotion.div>
        )}

        <div className="flex flex-col gap-2.5">
          {PRACTICE_MODES.map((mode, idx) => {
            const isDone = completed.has(mode);
            return (
              <AdaptiveMotion.div
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 + idx * 0.06 }}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={`/${locale}/practice/${mode}`}
                  onClick={handleTileTap}
                  data-testid={`practice-tile-${mode}`}
                  data-complete={isDone}
                  aria-label={
                    isDone
                      ? `${t(`gameModes.${mode}.name`)} — ${t('practiceHub.completedBadge')}`
                      : t(`gameModes.${mode}.name`)
                  }
                  className={`relative flex items-center gap-3 rounded-neo border-2 ${MODE_ACCENT[mode]} ${MODE_TINT[mode]} px-3 py-2.5 transition-colors active:translate-y-px shadow-hard-sm overflow-hidden`}
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-neo border-2 border-neo-black overflow-hidden bg-neo-navy">
                    <Image
                      src={MODE_HERO[mode]}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-neo-display font-bold text-neo-cream flex items-center gap-1.5">
                      <span aria-hidden className="text-sm shrink-0">{MODE_EMOJI[mode]}</span>
                      <span className="truncate">{t(`gameModes.${mode}.name`)}</span>
                    </h2>
                    <p className="text-xs font-neo-body text-neo-cream/85 mt-0.5 leading-snug line-clamp-2 pe-6">
                      {t(`gameModes.${mode}.description`)}
                    </p>
                  </div>

                  {isDone && (
                    <AdaptiveMotion.span
                      aria-hidden
                      animate={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
                      className="absolute top-1.5 end-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black font-neo-display font-black text-xs shadow-hard-sm"
                    >
                      ✓
                    </AdaptiveMotion.span>
                  )}
                </Link>
              </AdaptiveMotion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
