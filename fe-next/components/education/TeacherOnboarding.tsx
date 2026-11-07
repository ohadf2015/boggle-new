'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Gamepad2, School, Share2, Smartphone, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEduTeacherOnboardingStep } from '@/lib/education/telemetry';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_LINK, NB_PRIMARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';

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
      <NbDialogContent data-testid="how-it-works" noDescription size="sm">
        <NbDialogHeader color="yellow" title={t('education.onboarding.title')} closeLabel={t('common.close')} />
        <NbDialogBody>
          <ol className="flex flex-col gap-2.5">
            {STEPS.map(({ id, icon: Icon }, i) => (
              <li key={id} data-testid={`onboarding-step-${id}`} className={cn('flex items-start gap-3 rounded-neo-lg border-[3px] px-3 py-2.5 shadow-hard', NB_BLOCK.navy)}>
                <span aria-hidden="true" className={cn(NB_STICKER, NB_BLOCK.lime, 'mt-0.5 size-8 justify-center px-0 font-neo-display text-sm')}>
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="inline-flex items-center gap-1.5 font-neo-display text-base font-black">
                    <Icon className="size-4 shrink-0 text-neo-cyan" aria-hidden="true" />
                    {t(`education.onboarding.steps.${id}.title`)}
                  </span>
                  <span className="font-neo-body text-sm text-neo-cream/80">{t(`education.onboarding.steps.${id}.text`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </NbDialogBody>
        <NbDialogFooter className="sm:justify-between">
          <Link href={`/${language}/education/help`} onClick={onDismiss} className={cn(NB_LINK, 'justify-center')}>
            {t('eduShell.account.help')}
          </Link>
          <button type="button" onClick={done} className={NB_PRIMARY}>
            {t('education.onboarding.gotIt')}
          </button>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}

export default TeacherOnboarding;
