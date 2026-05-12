'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const MODE_ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan bg-neo-cyan/10',
  wordHunt: 'border-neo-lime bg-neo-lime/10',
  wheelRush: 'border-neo-purple bg-neo-purple/10',
};

const MODE_CTA: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan text-neo-black',
  wordHunt: 'bg-neo-lime text-neo-black',
  wheelRush: 'bg-neo-purple text-neo-cream',
};

const TIP_ICONS = ['✏️', '💡', '🎯'];

interface Props {
  mode: PracticeMode;
  onDismiss: () => void;
}

/**
 * Compact desktop onboarding card — shown once per mode on screens ≥768px
 * instead of the full PracticeTutorialSheet (which is optimised for mobile
 * vertical scroll). Shows the same 3 tip lines in a single-row grid so the
 * player gets context without a full-screen gate.
 */
export default function PracticeDesktopWelcome({ mode, onDismiss }: Props) {
  const { t } = useLanguage();
  const tipKeys = [1, 2, 3].map((n) => `practice.tips.${mode}.line${n}`);

  return (
    <AdaptiveMotion.div
      data-testid="practice-desktop-welcome"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`w-full max-w-2xl mx-auto mb-4 rounded-neo border-2 ${MODE_ACCENT[mode]} p-4`}
    >
      <div className="grid grid-cols-3 gap-3 mb-3">
        {tipKeys.map((key, i) => (
          <div
            key={key}
            className="flex flex-col gap-1 rounded-neo bg-neo-navy/40 border border-neo-black/20 px-3 py-2"
          >
            <span className="text-base leading-none" aria-hidden>{TIP_ICONS[i]}</span>
            <p className="text-xs font-neo-body text-neo-cream/90 leading-snug">
              {t(key)}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={`w-full py-2 px-4 rounded-neo border-2 border-neo-black font-neo-display font-black text-sm shadow-hard active:translate-y-px active:shadow-hard-pressed ${MODE_CTA[mode]}`}
      >
        {t('common.gotIt')} →
      </button>
    </AdaptiveMotion.div>
  );
}
