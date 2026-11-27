'use client';

import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { TeacherTrialWelcome } from './TeacherTrialWelcome';
import { TrialFirstSessionChecklist } from './home/TrialFirstSessionChecklist';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PolarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import type { TeacherProGrant } from '@/hooks/useTeacherPro';
import type { TrialFirstSessionController } from '@/hooks/useTrialFirstSession';

/** One HQ overlay: paid celebration, Polar trial welcome, or gifted Pro. The trial welcome also carries the first-session checklist. */
export function TeacherHqWelcome({
  welcomeKind,
  grant,
  trialExpires,
  session,
}: {
  welcomeKind: PolarCheckoutWelcomeKind;
  grant: TeacherProGrant | null;
  trialExpires: string | null;
  session?: TrialFirstSessionController | null;
}) {
  const { t } = useLanguage();
  const step = session?.checklist.welcomePointsAt ?? null;
  const nextHref = step && session ? session.hrefs[step] : undefined;
  return (
    <>
      <ProWelcomeCelebration
        grant={welcomeKind === 'trial' ? null : grant}
        paid={welcomeKind === 'paid'}
      />
      {welcomeKind === 'trial' ? (
        <TeacherTrialWelcome
          trialExpires={trialExpires}
          nextHref={nextHref}
          nextLabelKey={step ? `eduShell.firstSession.steps.${step}.cta` : undefined}
          onEngage={() => {
            if (step) session?.engage(step);
          }}
          onAbandon={() => {
            if (step) session?.abandon(step);
          }}
        />
      ) : null}
      {session ? (
        <TrialFirstSessionChecklist
          checklist={session.checklist}
          hrefs={session.hrefs}
          onDismiss={session.dismiss}
          onEngage={session.engage}
          onOpenAssignment={session.openAssignment}
          onSchedule={session.schedule}
          t={t}
        />
      ) : null}
    </>
  );
}
