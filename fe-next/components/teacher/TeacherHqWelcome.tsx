'use client';

import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { TeacherTrialWelcome } from './TeacherTrialWelcome';
import type { PolarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import type { TeacherProGrant } from '@/hooks/useTeacherPro';

/** One HQ overlay: paid celebration, Polar trial welcome, or gifted Pro. */
export function TeacherHqWelcome({
  welcomeKind,
  grant,
  trialExpires,
}: {
  welcomeKind: PolarCheckoutWelcomeKind;
  grant: TeacherProGrant | null;
  trialExpires: string | null;
}) {
  return (
    <>
      <ProWelcomeCelebration
        grant={welcomeKind === 'trial' ? null : grant}
        paid={welcomeKind === 'paid'}
      />
      {welcomeKind === 'trial' ? <TeacherTrialWelcome trialExpires={trialExpires} /> : null}
    </>
  );
}
