'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import PracticeStreakChip from '@/components/practice/PracticeStreakChip';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import PracticeHubAtmosphere from '@/components/practice/PracticeHubAtmosphere';
import PracticeHubHeader from '@/components/practice/PracticeHubHeader';
import PracticeModeCard from '@/components/practice/PracticeModeCard';
import PracticeCoachingTip from '@/components/practice/PracticeCoachingTip';
import { useFTUEGate } from '@/lib/onboarding/useFTUEGate';
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
  useFTUEGate(locale, `/${locale}/practice`);
  const handleTileTap = () => {
    playButtonClickSound();
    haptics.tap();
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-linear-to-b from-neo-navy to-neo-navy-light px-4 sm:px-6 py-6 sm:py-10">
      <PracticeHubAtmosphere />
      <div className="relative z-10 max-w-md md:max-w-3xl xl:max-w-5xl mx-auto">
        {/* Always-visible back to landing — restores hardware-back parity on
            desktop where there's no native gesture. */}
        <div className="mb-3 flex items-center justify-start">
          <Link
            href={`/${locale}`}
            data-testid="practice-hub-back"
            onClick={handleTileTap}
            aria-label={t('common.back')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-neo-cream/30 text-neo-cream/80 hover:text-neo-cream hover:border-neo-cream/60 text-xs font-neo-display font-bold uppercase tracking-wide transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
            <span>{t('common.back')}</span>
          </Link>
        </div>
        <PendingRoomBanner locale={locale} />
        <PracticeHubHeader completedCount={completed.size} totalCount={PRACTICE_MODES.length} />

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

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
          {PRACTICE_MODES.map((mode) => {
            const isDone = completed.has(mode);
            return (
              <Link
                key={mode}
                href={`/${locale}/practice/${mode}`}
                onClick={handleTileTap}
                data-testid={`practice-tile-${mode}`}
                data-complete={isDone}
                className="group relative flex items-stretch gap-3 rounded-neo border-2 border-neo-black p-3 transition-all active:translate-y-px shadow-hard md:hover:shadow-hard-lg overflow-hidden md:hover:-translate-y-0.5"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-neo border-2 border-neo-black overflow-hidden bg-neo-navy">
                  <Image
                    src={MODE_HERO[mode]}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 96px, 80px"
                    className="object-cover transition-transform duration-500 md:group-hover:scale-110"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-neo-black/45 via-transparent to-transparent"
                  />
                  <span
                    aria-hidden
                    className="absolute bottom-1 start-1 text-base leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]"
                  >
                    {MODE_EMOJI[mode]}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <h2 className="text-base sm:text-lg font-neo-display font-black text-neo-cream truncate">
                    {t(`gameModes.${mode}.name`)}
                  </h2>
                  <p className="text-[0.72rem] sm:text-xs font-neo-body text-neo-cream/80 leading-snug line-clamp-2 pe-8">
                    {t(`gameModes.${mode}.description`)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(['feature1', 'feature2'] as const).map((fk) => (
                      <span
                        key={fk}
                        className="inline-flex items-center px-1.5 py-px rounded-full border border-neo-cream/25 bg-neo-navy/60 text-[0.6rem] font-neo-display font-bold text-neo-cream/85 uppercase tracking-wide"
                      >
                        {t(`gameModes.${mode}.${fk}`)}
                      </span>
                    ))}
                  </div>
                </div>

                <span
                  aria-hidden
                  className={`absolute top-1/2 end-2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-neo-black bg-neo-cream/95 text-neo-navy shadow-hard-sm transition-transform duration-300 md:opacity-0 md:translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0`}
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={3} />
                </span>

                {isDone && (
                  <AdaptiveMotion.span
                    aria-hidden
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
                    className="absolute top-1.5 end-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-neo-yellow text-neo-navy border-2 border-neo-black font-neo-display font-black text-xs shadow-hard-sm"
                  >
                    ★
                  </AdaptiveMotion.span>
                )}
              </Link>
            );
          })}
        </div>

        <PracticeCoachingTip completedCount={completed.size} />
      </div>
    </div>
  );
}
