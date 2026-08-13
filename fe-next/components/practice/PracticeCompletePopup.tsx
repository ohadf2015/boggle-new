'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePracticeStreak } from '@/hooks/usePracticeStreak';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge/storage';
import { selectFirstSessionDailyCta } from '@/lib/growth/firstSessionDailyCta';
import {
  trackFirstSessionDailyClicked,
  trackFirstSessionDailyShown,
} from '@/utils/growthTracking';
import { haptics } from '@/utils/haptics';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeChainCta from './PracticeChainCta';
import InlineConfetti from '@/components/effects/InlineConfetti';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import type { Language } from '@/shared/types/game';

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
  wheelRush: 'text-neo-white',
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
 * Single-CTA by design. On the FTUE first classic session the CTA is today's
 * live Daily (D1 hook). Otherwise the chain CTA continues the practice playlist.
 * The "skip to real game" escape already lives on the sandbox itself.
 */
export default function PracticeCompletePopup({ open, mode, onDismiss }: Props) {
  const { t, language } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
  const { current: practiceStreak } = usePracticeStreak();
  const shownRef = useRef(false);

  const firstGameFromUrl =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('firstGame') === '1';
  const isFirstSession = firstGameFromUrl || practiceStreak <= 1;
  const dailyCta = selectFirstSessionDailyCta({
    alreadyPlayedToday: hasPlayedWordHuntToday(language as Language),
    isFirstSession,
  });
  // FTUE lands on classic practice. That's the D1 conversion window —
  // send them to today's live Daily instead of the next practice sandbox.
  const showFirstSessionDaily = open && mode === 'classic' && dailyCta.variant === 'first_session';

  // Light haptic on first open — celebration handshake.
  useEffect(() => {
    if (open) haptics.tap();
  }, [open]);

  useEffect(() => {
    if (!showFirstSessionDaily || shownRef.current) return;
    shownRef.current = true;
    trackFirstSessionDailyShown({ variant: dailyCta.variant, surface: 'practice_complete' });
  }, [showFirstSessionDaily, dailyCta.variant]);

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

  if (!open) return null;

  // CSS-only entrance (no Framer): the content's resting state is the normal
  // cascade (opacity:1), so it can never get stuck invisible behind the dark
  // backdrop — the bug that painted popups as a bare black overlay on RTL.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('practice.complete.title')}
      data-testid="practice-complete-popup"
    >
      {/* Backdrop — soft blur. Tap-through is intentional: chain CTA is
          the primary out, dismiss button is the secondary. */}
      <div
        className="absolute inset-0 bg-neo-navy/85 backdrop-blur-sm pointer-events-none animate-fadeIn"
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

      <div
        data-testid={`practice-complete-popup-panel-${mode}`}
        className={`relative w-full max-w-sm rounded-neo border-3 ${ACCENT_BORDER[mode]} bg-neo-navy-light shadow-hard-lg animate-pop-in`}
      >
        {/* Mode-color accent bar — same chrome as MistakeCoach */}
        <div className={`h-1.5 ${ACCENT_BAR[mode]}`} aria-hidden />

        {onDismiss && (
          <button
            type="button"
            data-testid="practice-complete-popup-dismiss"
            onClick={handleDismiss}
            aria-label={t('practice.keepPracticing')}
            className="absolute top-2 end-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-neo-white hover:text-neo-white hover:bg-neo-cream/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}

        <div className="p-5 flex flex-col gap-4">
          <PracticeCompleteBanner mode={mode} />
          {showFirstSessionDaily && dailyCta.href ? (
            <div className="flex flex-col items-center gap-2">
              <p
                data-testid="first-session-comeback"
                className="text-sm font-bold text-neo-orange text-center"
              >
                {t(dailyCta.comeBackKey)}
              </p>
              <div className="relative w-full">
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -inset-1 rounded-neo blur-md ${CTA_BG[mode]} opacity-30 animate-pulse`}
                />
                <Link
                  href={`/${language}${dailyCta.href}`}
                  data-testid="first-session-daily-cta"
                  data-variant={dailyCta.variant}
                  onClick={() => {
                    trackFirstSessionDailyClicked({
                      variant: dailyCta.variant,
                      surface: 'practice_complete',
                    });
                    playButtonClickSound();
                    haptics.tap();
                  }}
                  className={`relative inline-flex items-center justify-center w-full ${CTA_BG[mode]} ${CTA_TEXT[mode]} border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed`}
                >
                  {t(dailyCta.ctaKey)}
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Subtle pulsing glow ring behind the primary CTA — celebration
                  emphasis. CSS pulse so it never depends on Framer. */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -inset-1 rounded-neo blur-md ${CTA_BG[mode]} opacity-30 animate-pulse`}
              />
              <PracticeChainCta
                currentMode={mode}
                className={`relative inline-flex items-center justify-center w-full ${CTA_BG[mode]} ${CTA_TEXT[mode]} border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
