'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Gamepad2, School, Share2, Smartphone, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEduTeacherOnboardingStep } from '@/lib/education/telemetry';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PRIMARY_BUTTON, QUIET_LINK } from '@/components/teacher/home/homeStyles';

const STEPS: { id: string; icon: LucideIcon }[] = [
  { id: 'create', icon: School },
  { id: 'share', icon: Share2 },
  { id: 'join', icon: Smartphone },
  { id: 'play', icon: Gamepad2 },
];

export interface TeacherOnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

/** The "?" help: how a class game runs, in four lines, with the help center one tap away. */
export function TeacherOnboarding({ open, onDismiss }: TeacherOnboardingProps) {
  const { t, language } = useLanguage();

  useEffect(() => {
    if (open) trackEduTeacherOnboardingStep({ step: 0, totalSteps: STEPS.length, action: 'view' });
  }, [open]);

  const done = () => {
    trackEduTeacherOnboardingStep({ step: STEPS.length - 1, totalSteps: STEPS.length, action: 'complete' });
    onDismiss();
  };
  const close = (next: boolean) => {
    if (next) return;
    trackEduTeacherOnboardingStep({ step: 0, totalSteps: STEPS.length, action: 'skip' });
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        data-testid="how-it-works"
        noDescription
        closeButtonLabel={t('common.close')}
        className="max-h-[90dvh] overflow-y-auto border-[3px] border-neo-cream bg-neo-navy text-neo-cream sm:max-w-md"
      >
        <DialogTitle className="pe-8 font-neo-display text-xl font-black leading-tight text-neo-cream">
          {t('education.onboarding.title')}
        </DialogTitle>
        <ol className="flex flex-col gap-2">
          {STEPS.map(({ id, icon: Icon }, i) => (
            <li key={id} data-testid={`onboarding-step-${id}`} className="flex items-start gap-3 rounded-neo border-[2px] border-neo-cream/20 px-3 py-2.5">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full border-[2px] border-neo-black bg-neo-lime font-neo-display text-sm font-black text-neo-black"
              >
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="inline-flex items-center gap-1.5 font-neo-body text-sm font-bold">
                  <Icon className="size-4 shrink-0 text-neo-cyan" aria-hidden="true" />
                  {t(`education.onboarding.steps.${id}.title`)}
                </span>
                <span className="font-neo-body text-sm text-neo-cream/75">{t(`education.onboarding.steps.${id}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/${language}/education/help`} onClick={onDismiss} className={QUIET_LINK}>
            {t('eduShell.account.help')}
          </Link>
          <button type="button" onClick={done} className={cn(PRIMARY_BUTTON, 'min-h-[48px] text-base')}>
            {t('education.onboarding.gotIt')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TeacherOnboarding;
