'use client';

import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinNextAssignmentCta } from './JoinNextAssignmentCta';

const K = 'education.student.join';

export function JoinSuccessPanel({
  classroomId,
  alreadyMember,
}: {
  classroomId: string;
  alreadyMember: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div data-testid="join-success-panel" className="flex flex-col gap-4">
      <h1 className="font-neo-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-neo-white sm:text-4xl">
        {t(alreadyMember ? `${K}.alreadyMember` : `${K}.success`)}
      </h1>
      <p className="font-neo-body text-base font-bold text-neo-cyan">{t(`${K}.flow.joinedSub`)}</p>
      <JoinNextAssignmentCta classroomId={classroomId} />
      <p className="flex items-center gap-2 font-neo-body text-sm text-neo-white/70">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-neo-lime" />
        {t(`${K}.flow.joinedHeadline`)}
      </p>
    </div>
  );
}
