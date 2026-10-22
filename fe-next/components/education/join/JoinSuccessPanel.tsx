'use client';

import { useEffect, useRef } from 'react';
import { PartyPopper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinNextAssignmentCta } from './JoinNextAssignmentCta';

const K = 'education.student.join';

type JoinSuccessPanelProps =
  | { mode: 'class'; classroomId: string; alreadyMember: boolean; label?: string }
  | { mode: 'game'; label?: string };

/** Where the student landed and what happens next — focused on arrival. */
export function JoinSuccessPanel(props: JoinSuccessPanelProps) {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const alreadyMember = props.mode === 'class' && props.alreadyMember;

  return (
    <div data-testid="join-success-panel" className="flex flex-col gap-4">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-3 font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white outline-none sm:text-5xl lg:text-6xl"
      >
        <PartyPopper aria-hidden="true" className="size-9 shrink-0 text-neo-lime lg:size-12" />
        {t(alreadyMember ? `${K}.alreadyMember` : `${K}.success`)}
      </h1>

      {props.label && (
        <div className="rounded-neo border-3 border-neo-black bg-neo-lime p-3 shadow-hard">
          <p className="font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy/70">
            {t(props.mode === 'game' ? `${K}.preview.gameLabel` : `${K}.flow.yourClass`)}
          </p>
          <p className="font-neo-display text-2xl font-black leading-tight text-neo-navy lg:text-3xl">{props.label}</p>
        </div>
      )}

      {props.mode === 'game' ? (
        <p role="status" className="font-neo-body text-base font-bold text-neo-cyan lg:text-lg">
          {t(`${K}.flow.successGame`)}
        </p>
      ) : (
        <>
          <p className="font-neo-body text-base font-bold text-neo-cyan lg:text-lg">{t(`${K}.flow.joinedSub`)}</p>
          <JoinNextAssignmentCta classroomId={props.classroomId} />
        </>
      )}
    </div>
  );
}
