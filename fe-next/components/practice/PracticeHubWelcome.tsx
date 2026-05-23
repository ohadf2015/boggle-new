'use client';

import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

/**
 * First-time-only welcome card for the practice hub. Renders mascot + a warm
 * hello + a "start here" arrow that points the eye toward the first tile in
 * the chain. The hub itself decides when to mount (only when no modes are
 * complete) so this component stays presentation-only.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §12 ("No empty-state fun").
 */
export default function PracticeHubWelcome() {
  const { t } = useLanguage();

  return (
    <AdaptiveMotion.div
      data-testid="practice-hub-welcome"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="mb-5 flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-cyan/15 shadow-hard"
    >
      <AdaptiveMotion.div
        animate={{ rotate: [0, -6, 6, 0], y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-14 h-14 rounded-full border-2 border-neo-black overflow-hidden bg-neo-navy shrink-0"
      >
        <Image
          src="/mascot/scholar.webp"
          alt=""
          fill
          sizes="56px"
          className="object-contain"
          draggable={false}
        />
      </AdaptiveMotion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-neo-display font-black text-neo-cream leading-tight">
          {t('practiceHub.welcome.title')}
        </p>
        <p className="text-xs font-neo-body text-neo-cream/85 mt-0.5 leading-snug">
          {t('practiceHub.welcome.body')}
        </p>
      </div>
      <AdaptiveMotion.div
        data-testid="practice-hub-welcome-hint"
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="inline-flex items-center gap-1 text-[10px] uppercase font-neo-display font-black text-neo-cyan tracking-wider whitespace-nowrap"
      >
        <span>{t('practiceHub.welcome.startHere')}</span>
        <ArrowDown className="w-3 h-3" strokeWidth={3} aria-hidden />
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
  );
}
