'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { ChevronDown } from 'lucide-react';

/**
 * Scroll indicator (bouncing chevron — consumed by LandingView).
 *
 * Kept in its own small file so LandingSEOSection can be lazy-loaded without
 * losing the above-the-fold scroll hint.
 */
export function ScrollIndicator() {
  return (
    <AdaptiveMotion.div
      className="flex flex-col items-center gap-1 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      <AdaptiveMotion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white" />
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
  );
}
