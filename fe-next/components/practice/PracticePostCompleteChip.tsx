'use client';

import { RotateCcw } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  open: boolean;
  mode: PracticeMode;
  onAgain?: () => void;
}

/**
 * Persistent floating chip rendered after the player dismisses the
 * completion popup but is still on the (now-completed) mode. Keeps the
 * "Continue to next mode" hand-off visible without forcing the modal back
 * up. Pinned bottom-right (LTR) / bottom-left (RTL via `end-`) just above
 * the bottom-stack inset (banner + nav clearance).
 *
 * Only renders when explicitly opened — sandbox decides when to show.
 */
export default function PracticePostCompleteChip({ open, mode, onAgain }: Props) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <AdaptiveMotion.div
      data-testid="practice-post-complete-chip"
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className="fixed end-3 z-40 pointer-events-auto flex items-center gap-2"
      style={{ bottom: 'calc(var(--bottom-stack-height, 5rem) + 0.75rem)' }}
    >
      {onAgain && (
        <button
          type="button"
          onClick={onAgain}
          aria-label={t('practice.again')}
          data-testid="practice-again-btn"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-neo-cyan/20 border-2 border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30 transition active:translate-y-px shadow-hard-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
      <PracticeChainCta
        currentMode={mode}
        className="inline-flex items-center justify-center gap-2 bg-neo-lime text-neo-black border-3 border-neo-black rounded-full py-2 px-4 font-neo-display font-black text-xs shadow-hard active:translate-y-px active:shadow-hard-pressed"
      />
    </AdaptiveMotion.div>
  );
}
