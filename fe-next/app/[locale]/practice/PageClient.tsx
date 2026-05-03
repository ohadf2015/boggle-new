'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
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
  const { t } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
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
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-neo-display font-bold text-neo-cream mb-2">
            {t('practiceHub.title')}
          </h1>
          <p className="text-sm font-neo-body text-neo-cream/85 italic">
            {t('practiceHub.subtitle')}
          </p>
        </AdaptiveMotion.div>

        <div className="flex flex-col gap-3">
          {PRACTICE_MODES.map((mode, idx) => (
            <AdaptiveMotion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 + idx * 0.06 }}
            >
              <Link
                href={`/${locale}/practice/${mode}`}
                onClick={handleTileTap}
                className={`block rounded-neo border-2 ${MODE_ACCENT[mode]} bg-neo-navy-light px-5 py-4 transition-colors active:translate-y-px shadow-hard-sm`}
              >
                <h2 className="text-lg font-neo-display font-bold text-neo-cream">
                  {t(`gameModes.${mode}.name`)}
                </h2>
                <p className="text-sm font-neo-body text-neo-cream/90 mt-1">
                  {t(`gameModes.${mode}.description`)}
                </p>
              </Link>
            </AdaptiveMotion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
