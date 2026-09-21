'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { trackEduTeacherOnboardingStep } from '@/lib/education/telemetry';
import { TeacherSetupSteps, TEACHER_SETUP_STEP_COUNT } from './TeacherSetupSteps';

const TOTAL_STEPS = TEACHER_SETUP_STEP_COUNT;

export interface TeacherOnboardingProps {
  /** Callback when onboarding is completed */
  onComplete?: () => void;
  /** Callback when onboarding is skipped */
  onSkip?: () => void;
  /** Force the infographic open even if already dismissed (reopened via "?") */
  forceShow?: boolean;
  /** Called after any dismissal when forceShow is used */
  onDismiss?: () => void;
}

/**
 * Teacher Onboarding — "How it works" infographic
 *
 * A single glanceable strip of 5 numbered steps:
 *   1. Create your classroom
 *   2. Share the join code/link
 *   3. Students join from any device
 *   4. Run a live word game
 *   5. See results in your dashboard
 *
 * Horizontal strip on desktop, vertical stack on mobile. Each step has a big
 * number badge, a lucide icon, one short line, and a small pure-CSS mock.
 *
 * Features:
 * - Dismissible + persisted (shows only on first visit)
 * - Reopenable from the teacher dashboard "?" button (forceShow)
 * - Fires edu_teacher_onboarding_step telemetry (view / complete / skip)
 * - Neo-brutalist styling, RTL-aware
 */
export const TeacherOnboarding = memo<TeacherOnboardingProps>(({
  onComplete,
  onSkip,
  forceShow = false,
  onDismiss,
}) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    shouldShowOnboarding,
    complete,
    skip,
  } = useTeacherOnboardingState();

  const isVisible = forceShow || shouldShowOnboarding;

  // Funnel top: one view event per open
  useEffect(() => {
    if (isVisible) {
      trackEduTeacherOnboardingStep({ step: 0, totalSteps: TOTAL_STEPS, action: 'view' });
    }
  }, [isVisible]);

  useFocusTrap(modalRef, isVisible, onSkip);

  // Dismiss via the primary CTA — marks onboarding complete (persisted)
  const handleComplete = useCallback(() => {
    trackEduTeacherOnboardingStep({
      step: TOTAL_STEPS - 1,
      totalSteps: TOTAL_STEPS,
      action: 'complete',
    });
    complete();
    onComplete?.();
    onDismiss?.();
  }, [complete, onComplete, onDismiss]);

  // Dismiss via the X — marks onboarding skipped (persisted)
  const handleSkip = useCallback(() => {
    trackEduTeacherOnboardingStep({
      step: 0,
      totalSteps: TOTAL_STEPS,
      action: 'skip',
    });
    skip();
    onSkip?.();
    onDismiss?.();
  }, [skip, onSkip, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      // Class-5: an opacity-from-0 entrance on a FULLSCREEN layer promotes a
      // page-sized GPU layer and flashes on the Chromium mobile renderer. The
      // backdrop now paints at its resting value on frame one; the panel
      // inside it keeps its (small, bounded) entrance.
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-black/70 p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto',
          'bg-neo-navy border-neo-thick border-neo-cream',
          'rounded-neo-lg shadow-hard-xl',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('education.onboarding.title')}
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className={cn(
            'absolute top-3 z-10 flex h-11 w-11 items-center justify-center',
            // A bare glyph on the panel is not a control: it has no fill and no
            // border, so the only way out of a first-run modal was a shape you
            // had to already know was there. Cream edge, ~15:1 against navy.
            'rounded-neo border-2 border-neo-cream bg-neo-navy text-neo-white',
            'hover:bg-neo-pink hover:text-black transition-colors',
            isRTL ? 'left-3' : 'right-3'
          )}
          aria-label={t('common.skip')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center sm:px-10">
          <h2 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white text-balance">
            {t('education.onboarding.title')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-neo-white/80 font-neo-body text-pretty">
            {t('education.onboarding.subtitle')}
          </p>
        </div>

        {/* The five steps, shared with the public /education section so a
            teacher reads one explanation of the product, not two. */}
        <TeacherSetupSteps className="px-6 pb-4 sm:px-10" />

        {/* Primary CTA */}
        <div className="flex justify-center px-6 pb-8 pt-2 sm:px-10">
          <Button
            onClick={handleComplete}
            className={cn(
              'h-12 min-w-[220px] px-8 font-neo-display font-black uppercase',
              'bg-neo-cyan text-neo-black',
              'border-neo border-neo-black shadow-hard',
              'hover:-translate-y-0.5 hover:bg-neo-cyan/90 hover:shadow-hard-lg',
              'active:translate-y-0.5 active:shadow-hard-pressed transition-all'
            )}
          >
            <Check className="me-2 h-5 w-5" />
            {t('education.onboarding.gotIt')}
          </Button>
        </div>

        {/* Decorative sparkles */}
        <div className="pointer-events-none absolute top-8 inset-s-6 text-neo-lime/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="pointer-events-none absolute bottom-10 inset-e-8 text-neo-pink/30">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
});

TeacherOnboarding.displayName = 'TeacherOnboarding';

export default TeacherOnboarding;
