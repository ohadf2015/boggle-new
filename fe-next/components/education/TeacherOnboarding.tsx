'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { m, useReducedMotion } from 'framer-motion';
import {
  School,
  Share2,
  Smartphone,
  Gamepad2,
  BarChart3,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { trackEduTeacherOnboardingStep } from '@/lib/education/telemetry';

interface InfographicStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  textKey: string;
  badgeBg: string;
  /** Small pure-CSS/SVG mock illustrating the step — no external images */
  visual: React.ReactNode;
}

/** Mini phone frame showing a join code (step 2) */
function PhoneCodeVisual() {
  return (
    <div className="mx-auto w-14 rounded-neo border-2 border-neo-black bg-neo-navy-light p-1.5 shadow-hard-sm">
      <div className="mx-auto mb-1 h-1 w-5 rounded-full bg-neo-white/30" />
      <div className="rounded-neo-sm border border-neo-black bg-neo-lime px-1 py-1.5 text-center font-mono text-[10px] font-black tracking-widest text-neo-black">
        ABC123
      </div>
    </div>
  );
}

/** Mini classroom card (step 1) */
function ClassroomCardVisual() {
  return (
    <div className="mx-auto w-20 rounded-neo border-2 border-neo-black bg-neo-cream p-1.5 shadow-hard-sm">
      <div className="mb-1 h-2 w-3/4 rounded-full bg-neo-cyan border border-neo-black" />
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-3 rounded-full border border-neo-black bg-neo-pink" />
        ))}
      </div>
    </div>
  );
}

/** Three devices joining (step 3) */
function DevicesVisual() {
  return (
    <div className="mx-auto flex items-end justify-center gap-1">
      <div className="h-9 w-6 rounded-neo-sm border-2 border-neo-black bg-neo-cyan shadow-hard-sm" />
      <div className="h-11 w-7 rounded-neo-sm border-2 border-neo-black bg-neo-lime shadow-hard-sm" />
      <div className="h-8 w-8 rounded-neo-sm border-2 border-neo-black bg-neo-pink shadow-hard-sm" />
    </div>
  );
}

/** Mini letter grid (step 4) */
function LetterGridVisual() {
  const letters = ['W', 'O', 'R', 'D'];
  return (
    <div className="mx-auto grid w-16 grid-cols-2 gap-0.5">
      {letters.map((letter, i) => (
        <div
          key={i}
          className={cn(
            'flex h-7 items-center justify-center rounded-neo-sm border-2 border-neo-black font-neo-display text-xs font-black text-neo-black',
            i % 2 === 0 ? 'bg-neo-lime' : 'bg-neo-cyan'
          )}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

/** Mini bar chart (step 5) */
function BarChartVisual() {
  const bars = [
    { h: 'h-4', bg: 'bg-neo-cyan' },
    { h: 'h-7', bg: 'bg-neo-lime' },
    { h: 'h-10', bg: 'bg-neo-pink' },
  ];
  return (
    <div className="mx-auto flex h-11 items-end justify-center gap-1">
      {bars.map((bar, i) => (
        <div key={i} className={cn('w-4 rounded-t-neo-sm border-2 border-neo-black', bar.h, bar.bg)} />
      ))}
    </div>
  );
}

const INFOGRAPHIC_STEPS: InfographicStep[] = [
  {
    id: 'create',
    icon: School,
    titleKey: 'education.onboarding.steps.create.title',
    textKey: 'education.onboarding.steps.create.text',
    badgeBg: 'bg-neo-cyan',
    visual: <ClassroomCardVisual />,
  },
  {
    id: 'share',
    icon: Share2,
    titleKey: 'education.onboarding.steps.share.title',
    textKey: 'education.onboarding.steps.share.text',
    badgeBg: 'bg-neo-pink',
    visual: <PhoneCodeVisual />,
  },
  {
    id: 'join',
    icon: Smartphone,
    titleKey: 'education.onboarding.steps.join.title',
    textKey: 'education.onboarding.steps.join.text',
    badgeBg: 'bg-neo-lime',
    visual: <DevicesVisual />,
  },
  {
    id: 'play',
    icon: Gamepad2,
    titleKey: 'education.onboarding.steps.play.title',
    textKey: 'education.onboarding.steps.play.text',
    badgeBg: 'bg-neo-cyan',
    visual: <LetterGridVisual />,
  },
  {
    id: 'results',
    icon: BarChart3,
    titleKey: 'education.onboarding.steps.results.title',
    textKey: 'education.onboarding.steps.results.text',
    badgeBg: 'bg-neo-pink',
    visual: <BarChartVisual />,
  },
];

const TOTAL_STEPS = INFOGRAPHIC_STEPS.length;

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
  const shouldReduceMotion = useReducedMotion();

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-black/70 p-4 animate-in fade-in-0 duration-300"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto',
          'bg-neo-navy border-neo-thick border-neo-black',
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
            'text-neo-white hover:text-neo-pink transition-colors',
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

        {/* Infographic strip: vertical on mobile, horizontal on desktop */}
        <ol className="grid grid-cols-1 gap-3 px-6 pb-4 sm:grid-cols-2 sm:px-10 lg:grid-cols-5">
          {INFOGRAPHIC_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <m.li
                key={step.id}
                data-testid={`onboarding-step-${step.id}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : idx * 0.08, type: 'spring', stiffness: 300, damping: 26 }}
                className={cn(
                  'relative flex items-center gap-4 rounded-neo border-2 border-neo-black',
                  'bg-neo-navy-light p-4 shadow-hard-sm',
                  'sm:flex-col sm:items-start sm:gap-3'
                )}
              >
                {/* Number badge */}
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    'border-2 border-neo-black shadow-hard-sm',
                    'font-neo-display text-lg font-black text-neo-black',
                    step.badgeBg
                  )}
                  aria-hidden="true"
                >
                  {idx + 1}
                </div>

                <div className="flex-1 sm:flex sm:w-full sm:flex-col sm:gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-neo-white" />
                    <h3 className="font-neo-display text-sm font-bold text-neo-white text-balance">
                      {t(step.titleKey)}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-neo-white/70 font-neo-body leading-snug">
                    {t(step.textKey)}
                  </p>
                  <div className="mt-2 hidden sm:block" aria-hidden="true">
                    {step.visual}
                  </div>
                </div>
              </m.li>
            );
          })}
        </ol>

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
