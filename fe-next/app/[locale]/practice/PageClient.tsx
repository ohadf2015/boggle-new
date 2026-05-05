'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, FastForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import PracticeStreakChip from '@/components/practice/PracticeStreakChip';
import PracticeHubWelcome from '@/components/practice/PracticeHubWelcome';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import { markAllPracticeModesSkipped } from '@/lib/practice/practiceProgress';
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
  const router = useRouter();
  const completed = usePracticeProgress(language);
  const handleTileTap = () => {
    playButtonClickSound();
    haptics.tap();
  };
  // First-non-completed mode (Quick Start jumps here, skipping the per-mode
  // tutorial via ?play=1). Falls back to first mode if everything's done.
  const nextMode: PracticeMode =
    PRACTICE_MODES.find((m) => !completed.has(m)) ?? PRACTICE_MODES[0];
  const handleQuickStart = () => {
    playButtonClickSound();
    haptics.tap();
    router.push(`/${locale}/practice/${nextMode}?play=1`);
  };
  const handleSkipAll = () => {
    playButtonClickSound();
    haptics.tap();
    markAllPracticeModesSkipped(language);
    router.push(`/${locale}`);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-6 py-10">
      <div className="max-w-md mx-auto">
        <PendingRoomBanner locale={locale} />
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 text-center"
        >
          <h1 className="text-3xl font-neo-display font-bold text-neo-cream mb-2 flex items-center justify-center gap-2">
            <AdaptiveMotion.span
              aria-hidden
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
            >
              ✨
            </AdaptiveMotion.span>
            <span>{t('practiceHub.title')}</span>
          </h1>
          <p className="text-sm font-neo-body text-neo-cream/85 italic">
            {t('practiceHub.subtitle')}
          </p>
        </AdaptiveMotion.div>

        <div className="mb-6 flex flex-col items-center gap-2">
          <div
            data-testid="practice-progress-headline"
            className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-neo-display font-black text-neo-lime"
          >
            <span aria-hidden>★</span>
            <span>
              {t('practiceHub.progress', { done: completed.size, total: PRACTICE_MODES.length })}
            </span>
          </div>
          <PracticeStreakChip />
        </div>

        {/* Hub CTAs: Quick Start (jump straight into next mode play) +
            Skip All (mark all complete + go home). Visible always so the user
            can opt out of the tutorial flow at any time. */}
        <div
          data-testid="practice-hub-ctas"
          className="mb-5 flex flex-col gap-2"
        >
          <button
            type="button"
            data-testid="practice-hub-quick-start"
            onClick={handleQuickStart}
            className="flex items-center justify-center gap-2 w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed"
          >
            <Play className="w-5 h-5" aria-hidden />
            <span>{t('practiceHub.quickStartCta')}</span>
          </button>
          <button
            type="button"
            data-testid="practice-hub-skip-all"
            onClick={handleSkipAll}
            className="flex items-center justify-center gap-2 w-full bg-transparent text-neo-cream/80 border-2 border-neo-cream/40 rounded-neo py-2 px-4 font-neo-display font-bold text-sm hover:border-neo-cream/70 active:translate-y-px"
          >
            <FastForward className="w-4 h-4" aria-hidden />
            <span>{t('practiceHub.skipAllCta')}</span>
          </button>
        </div>

        {completed.size === 0 && <PracticeHubWelcome />}

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

        <div className="flex flex-col gap-3">
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
                  className={`relative flex items-center gap-3 rounded-neo border-2 ${MODE_ACCENT[mode]} ${MODE_TINT[mode]} px-3 py-3 transition-colors active:translate-y-px shadow-hard-sm overflow-hidden`}
                >
                  {/* Hero thumbnail — same image as the tutorial help modal,
                      establishing visual continuity across the practice flow. */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-neo border-2 border-neo-black overflow-hidden bg-neo-navy">
                    <Image
                      src={MODE_HERO[mode]}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-neo-display font-bold text-neo-cream flex items-center gap-1.5">
                      <span aria-hidden className="text-base shrink-0">{MODE_EMOJI[mode]}</span>
                      <span className="truncate">{t(`gameModes.${mode}.name`)}</span>
                    </h2>
                    <p className="text-xs sm:text-sm font-neo-body text-neo-cream/90 mt-0.5 leading-snug pe-6">
                      {t(`gameModes.${mode}.description`)}
                    </p>
                    {isDone && (
                      <p className="text-[10px] sm:text-xs font-neo-body text-neo-lime/90 mt-1 italic">
                        {t('practiceHub.completedDesc')}
                      </p>
                    )}
                  </div>

                  {isDone && (
                    <AdaptiveMotion.span
                      aria-hidden
                      animate={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
                      className="absolute top-2 end-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black font-neo-display font-black text-sm shadow-hard-sm"
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
