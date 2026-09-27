'use client';

import React, { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';

const EXPERIMENT_KEY = 'wheel-replay-cta-v1' as const;

/**
 * Anti-bounce second-activity hook for the Word Wheel "already-played" dead-end.
 * A returning daily player who already solved today's wheel otherwise has no next
 * game — this surfaces an unlimited practice wheel in the same mechanic they just
 * enjoyed. Experiment-gated (wheel-replay-cta-v1) so the lift is measurable.
 */
const WordWheelReplayCta: React.FC = () => {
  const { t, language } = useLanguage();
  const { variant, trackExposure } = useExperiment(EXPERIMENT_KEY);
  const exposedRef = useRef(false);

  // The parent mounts this only in the 'already-played' dead-end, so being
  // mounted == eligible. Fire exposure for BOTH arms (control needs a
  // denominator) — render the link only in the treatment arm.
  useEffect(() => {
    if (exposedRef.current) return;
    exposedRef.current = true;
    trackExposure();
  }, [trackExposure]);

  if (variant !== 'practice-cta') return null;

  const href = practiceTargetUrl('wheelRush', language);

  return (
    <m.div
      className="w-full z-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <Link
        href={href}
        data-testid="wheel-replay-cta"
        onClick={() => trackGrowthEvent('wheel_practice_cta_clicked', { experiment: EXPERIMENT_KEY, variant })}
        className="flex items-center gap-3 w-full p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-sm hover:bg-neo-navy active:translate-x-px active:translate-y-px transition-colors"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
          <RotateCcw className="w-5 h-5 text-neo-purple" aria-hidden />
        </span>
        <span>
          <span className="block font-neo-display font-black text-neo-white text-sm leading-tight">
            {t('wordWheel.replay.title')}
          </span>
          <span className="block text-neo-white/55 text-xs mt-0.5">
            {t('wordWheel.replay.subtitle')}
          </span>
        </span>
      </Link>
    </m.div>
  );
};

export default WordWheelReplayCta;
