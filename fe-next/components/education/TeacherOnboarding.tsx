'use client';

import { memo, useCallback, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import {
  GraduationCap,
  Users,
  BookOpen,
  Send,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { trackEduTeacherOnboardingStep } from '@/lib/education/telemetry';

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  color: string;
  bgColor: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: <GraduationCap className="w-12 h-12" />,
    titleKey: 'education.onboarding.welcome.title',
    descriptionKey: 'education.onboarding.welcome.description',
    color: 'text-neo-cyan',
    bgColor: 'bg-neo-cyan/20',
  },
  {
    id: 'classroom',
    icon: <Users className="w-12 h-12" />,
    titleKey: 'education.onboarding.classroom.title',
    descriptionKey: 'education.onboarding.classroom.description',
    color: 'text-neo-pink',
    bgColor: 'bg-neo-pink/20',
  },
  {
    id: 'lesson',
    icon: <BookOpen className="w-12 h-12" />,
    titleKey: 'education.onboarding.lesson.title',
    descriptionKey: 'education.onboarding.lesson.description',
    color: 'text-neo-lime',
    bgColor: 'bg-neo-lime/20',
  },
  {
    id: 'invite',
    icon: <Send className="w-12 h-12" />,
    titleKey: 'education.onboarding.invite.title',
    descriptionKey: 'education.onboarding.invite.description',
    color: 'text-neo-lime',
    bgColor: 'bg-neo-lime/20',
  },
];

export interface TeacherOnboardingProps {
  /** Callback when onboarding is completed */
  onComplete?: () => void;
  /** Callback when onboarding is skipped */
  onSkip?: () => void;
}

/**
 * Teacher Onboarding Wizard
 *
 * Guides first-time teachers through the setup process:
 * 1. Welcome to Education Mode
 * 2. Create your first classroom
 * 3. Build your first lesson
 * 4. Invite students
 *
 * Features:
 * - Multi-step wizard with progress indicator
 * - Skip option
 * - Persists state (shows only on first visit)
 * - Neo-brutalist styling
 */
export const TeacherOnboarding = memo<TeacherOnboardingProps>(({
  onComplete,
  onSkip,
}) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    shouldShowOnboarding,
    currentStep,
    nextStep,
    prevStep,
    complete,
    skip,
  } = useTeacherOnboardingState();

  useFocusTrap(modalRef, shouldShowOnboarding, onSkip);

  // Handle next/finish
  const handleNext = useCallback(() => {
    const isLast = currentStep >= ONBOARDING_STEPS.length - 1;
    trackEduTeacherOnboardingStep({
      step: currentStep,
      totalSteps: ONBOARDING_STEPS.length,
      action: isLast ? 'complete' : 'next',
    });
    if (!isLast) {
      nextStep();
    } else {
      complete();
      onComplete?.();
    }
  }, [currentStep, nextStep, complete, onComplete]);

  // Handle previous
  const handlePrev = useCallback(() => {
    trackEduTeacherOnboardingStep({
      step: currentStep,
      totalSteps: ONBOARDING_STEPS.length,
      action: 'back',
    });
    prevStep();
  }, [currentStep, prevStep]);

  // Handle skip
  const handleSkip = useCallback(() => {
    trackEduTeacherOnboardingStep({
      step: currentStep,
      totalSteps: ONBOARDING_STEPS.length,
      action: 'skip',
    });
    skip();
    onSkip?.();
  }, [currentStep, skip, onSkip]);

  // Don't render if onboarding shouldn't show
  if (!shouldShowOnboarding) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-black/70 p-4"
      >
        <AdaptiveMotion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative w-full max-w-lg',
            'bg-neo-navy border-neo-thick border-neo-black',
            'rounded-neo-lg shadow-hard-xl',
            'overflow-hidden'
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className={cn(
              'absolute top-4 p-2',
              'text-neo-white hover:text-neo-white',
              'transition-colors',
              isRTL ? 'left-4' : 'right-4'
            )}
            aria-label={t('common.skip')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 pt-6 px-6">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  idx === currentStep
                    ? 'w-8 bg-neo-cyan'
                    : idx < currentStep
                    ? 'w-2 bg-neo-cyan/50'
                    : 'w-2 bg-neo-white/20'
                )}
              />
            ))}
          </div>

          {/* Step content */}
          <AdaptiveAnimatePresence mode="wait">
            <AdaptiveMotion.div
              key={step.id}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              className="p-8 text-center"
            >
              {/* Icon */}
              <div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-24 h-24 mb-6',
                  'rounded-full border-neo border-neo-black',
                  step.bgColor,
                  step.color
                )}
              >
                {step.icon}
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white mb-4">
                {t(step.titleKey) || step.titleKey}
              </h2>

              {/* Description */}
              <p className="text-neo-white font-neo-body text-base sm:text-lg leading-relaxed max-w-sm mx-auto">
                {t(step.descriptionKey) || step.descriptionKey}
              </p>

              {/* Step number */}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neo-black/30 border border-neo-white/10">
                <span className={cn('text-sm font-bold', step.color)}>
                  {t('education.onboarding.step')} {currentStep + 1}
                </span>
                <span className="text-neo-white">
                  {t('education.onboarding.of')} {ONBOARDING_STEPS.length}
                </span>
              </div>
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>

          {/* Navigation buttons */}
          <div className={cn(
            'flex items-center justify-between gap-4 p-6 pt-0',
            isRTL && 'flex-row-reverse'
          )}>
            {/* Back button */}
            <Button
              onClick={handlePrev}
              disabled={isFirstStep}
              variant="outline"
              className={cn(
                'font-neo-display',
                'border-neo border-neo-black',
                'text-neo-white hover:bg-neo-white/10',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'shadow-hard-sm'
              )}
            >
              <ChevronLeft className="w-5 h-5 me-1 rtl:rotate-180" />
              {t('common.previous')}
            </Button>

            {/* Next/Finish button */}
            <Button
              onClick={handleNext}
              className={cn(
                'font-neo-display font-bold px-6',
                'bg-neo-cyan text-neo-black',
                'border-neo border-neo-black',
                'hover:bg-neo-cyan/90',
                'shadow-hard'
              )}
            >
              {isLastStep ? (
                <>
                  <Check className="w-5 h-5 me-2" />
                  {t('education.onboarding.getStarted')}
                </>
              ) : (
                <>
                  {t('common.next')}
                  <ChevronRight className="w-5 h-5 ms-1 rtl:rotate-180" />
                </>
              )}
            </Button>
          </div>

          {/* Decorative sparkles */}
          <div className="absolute top-8 inset-s-8 text-neo-lime/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute bottom-12 inset-e-12 text-neo-pink/30">
            <Sparkles className="w-4 h-4" />
          </div>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

TeacherOnboarding.displayName = 'TeacherOnboarding';

export default TeacherOnboarding;
