'use client';

import { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeChainCta from './PracticeChainCta';
import InlineConfetti from '@/components/effects/InlineConfetti';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const ACCENT_BORDER: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan',
  wordHunt: 'border-neo-lime',
  wheelRush: 'border-neo-purple',
};

const ACCENT_BAR: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan',
  wordHunt: 'bg-neo-lime',
  wheelRush: 'bg-neo-purple',
};

const CTA_BG: Record<PracticeMode, string> = {
  classic: 'bg-neo-lime',
  wordHunt: 'bg-neo-lime',
  wheelRush: 'bg-neo-purple',
};

const CTA_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-black',
  wordHunt: 'text-neo-black',
  wheelRush: 'text-neo-cream',
};

interface Props {
  open: boolean;
  mode: PracticeMode;
  /**
   * Optional dismiss handler. When provided, an ESC key press + a "keep
   * practicing" button close the popup. When omitted the popup is sticky
   * (chain CTA is the only out) — useful when we want to force the moment
   * to register before the player moves on.
   */
  onDismiss?: () => void;
}

/**
 * Celebratory completion popup — fired when a practice sandbox crosses its
 * goal. Renders the existing PracticeCompleteBanner + PracticeChainCta
 * inside a fixed-position modal so "continue to next mode" never sits below
 * the fold. The wrapped components keep their existing testids so all
 * completion-flow integration tests continue to pass without changes.
 *
 * Visual language follows PracticeMistakeCoach (same fixed-overlay scaffold,
 * same spring entrance, same neo-brutalist mode-accent color) for coherent
 * popup chrome across the practice surface.
 *
 * Single-CTA by design: the chain CTA ("continue to next mode") is the one
 * clear way forward. The "skip to real game" escape already lives on the
 * sandbox itself, so the popup doesn't repeat it.
 */
export default function PracticeCompletePopup({ open, mode, onDismiss }: Props) {
  const { t } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();

  // Light haptic on first open — celebration handshake.
  useEffect(() => {
    if (open) haptics.tap();
  }, [open]);

  // ESC dismisses only when a handler is provided. No handler = sticky popup.
  useEffect(() => {
    if (!open || !onDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (!onDismiss) return;
    playButtonClickSound();
    haptics.tap();
    onDismiss();
  }, [onDismiss, playButtonClickSound]);

  return (
    <AdaptiveAnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('practice.complete.title')}
          data-testid="practice-complete-popup"
        >
          {/* Backdrop — soft blur. Tap-through is intentional: chain CTA is
              the primary out, dismiss button is the secondary. */}
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-neo-navy/85 backdrop-blur-sm pointer-events-none"
            aria-hidden
          />

          {/* Confetti burst — celebration moment, layered behind the panel
              so the panel content stays on top. */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <InlineConfetti size="lg" />
          </div>

          <AdaptiveMotion.div
            data-testid={`practice-complete-popup-panel-${mode}`}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className={`relative w-full max-w-sm rounded-neo border-3 ${ACCENT_BORDER[mode]} bg-neo-navy-light shadow-hard-lg`}
          >
            {/* Mode-color accent bar — same chrome as MistakeCoach */}
            <div className={`h-1.5 ${ACCENT_BAR[mode]}`} aria-hidden />

            {onDismiss && (
              <button
                type="button"
                data-testid="practice-complete-popup-dismiss"
                onClick={handleDismiss}
                aria-label={t('practice.keepPracticing')}
                className="absolute top-2 end-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-neo-cream/70 hover:text-neo-cream hover:bg-neo-cream/10 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            )}

            <div className="p-5 flex flex-col gap-4">
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.22, ease: 'easeOut' }}
              >
                <PracticeCompleteBanner mode={mode} />
              </AdaptiveMotion.div>
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.18, type: 'spring', stiffness: 360, damping: 22 }}
                className="relative"
              >
                {/* Subtle pulsing glow ring behind the primary CTA — celebration
                    emphasis without breaking neo-brutalist hard-shadow rules
                    (animation lives on a separate layer). */}
                <AdaptiveMotion.div
                  aria-hidden
                  className={`pointer-events-none absolute -inset-1 rounded-neo blur-md ${CTA_BG[mode]} opacity-30`}
                  animate={{ opacity: [0.18, 0.35, 0.18] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <PracticeChainCta
                  currentMode={mode}
                  className={`relative inline-flex items-center justify-center w-full ${CTA_BG[mode]} ${CTA_TEXT[mode]} border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed`}
                />
              </AdaptiveMotion.div>
            </div>
          </AdaptiveMotion.div>
        </div>
      )}
    </AdaptiveAnimatePresence>
  );
}
