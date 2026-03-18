'use client';

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastComboType } from './utils/blastCombos';

// ==================== Types ====================

export interface BlastComboDiscoveryProps {
  pendingDiscovery: BlastComboType | null;
  onComplete: () => void;
}

// ==================== Constants ====================

// Shortened from 1800ms — discovery should inform, not block gameplay
const NORMAL_DISMISS_MS = 1200;
const REDUCED_DISMISS_MS = 200;

// ==================== Component ====================

/**
 * BlastComboDiscovery — overlay banner displayed on first-time combo detection.
 * Auto-dismisses after 1800ms (300ms in reduced-motion mode).
 * Parent is responsible for blocking grid input while pendingDiscovery !== null.
 */
export function BlastComboDiscovery({ pendingDiscovery, onComplete }: BlastComboDiscoveryProps) {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!pendingDiscovery) return;
    const ms = shouldReduceMotion ? REDUCED_DISMISS_MS : NORMAL_DISMISS_MS;
    const timer = setTimeout(onComplete, ms);
    return () => clearTimeout(timer);
  }, [pendingDiscovery, onComplete, shouldReduceMotion]);

  if (!pendingDiscovery) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        key={pendingDiscovery}
        data-testid="combo-discovery-banner"
        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      >
        {/* Backdrop — lighter to maintain game awareness */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Card */}
        <AdaptiveMotion.div
          className="relative border-neo border-black bg-neo-yellow shadow-hard-lg rounded-neo px-8 py-6 text-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
        >
          <p className="font-neo-display text-xl font-bold text-black uppercase tracking-wide mb-2">
            {t('blast.comboDiscovered')}
          </p>
          <p className="font-neo-display text-2xl font-bold text-neo-orange uppercase">
            {t(`blast.combo.${pendingDiscovery}`)}
          </p>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}
