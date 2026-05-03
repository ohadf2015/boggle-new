'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import PracticeStreakChip from '@/components/practice/PracticeStreakChip';
import PracticeHubWelcome from '@/components/practice/PracticeHubWelcome';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const MODE_ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan/80 hover:border-neo-cyan',
  wordHunt: 'border-neo-lime/80 hover:border-neo-lime',
  wheelRush: 'border-neo-purple/80 hover:border-neo-purple',
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
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-6 py-10">
      <div className="max-w-md mx-auto">
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 text-center"
        >
          <h1 className="text-3xl font-neo-display font-bold text-neo-cream mb-2">
            {t('practiceHub.title')}
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
                  className={`relative block rounded-neo border-2 ${MODE_ACCENT[mode]} bg-neo-navy-light px-5 py-4 transition-colors active:translate-y-px shadow-hard-sm`}
                >
                  {isDone && (
                    <span
                      aria-hidden
                      className="absolute top-2 end-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black font-neo-display font-black text-sm shadow-hard-sm"
                    >
                      ✓
                    </span>
                  )}
                  <h2 className="text-lg font-neo-display font-bold text-neo-cream">
                    {t(`gameModes.${mode}.name`)}
                  </h2>
                  <p className="text-sm font-neo-body text-neo-cream/90 mt-1 pe-8">
                    {t(`gameModes.${mode}.description`)}
                  </p>
                  {isDone && (
                    <p className="text-xs font-neo-body text-neo-lime/90 mt-2 italic">
                      {t('practiceHub.completedDesc')}
                    </p>
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
