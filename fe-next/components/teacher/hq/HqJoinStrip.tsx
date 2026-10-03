'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Link2, QrCode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { trackEduJoinCodeCopied } from '@/lib/education/telemetry';

const QUIET_BUTTON = cn(
  'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-neo px-2.5 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-white',
  'transition-colors hover:bg-neo-white/10 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
);

export interface HqJoinStripProps {
  classroomId: string;
  joinCode: string;
  studentCount: number;
  onOpenProjector: () => void;
  className?: string;
}

/** The class code once students are in: one quiet line, not a hero. */
export function HqJoinStrip({ classroomId, joinCode, studentCount, onOpenProjector, className }: HqJoinStripProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(classroomJoinUrl(window.location.origin, language, joinCode));
      trackEduJoinCodeCopied({ classroomId });
      setCopied(true);
      toast.success(t('share.linkCopied'));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [classroomId, joinCode, language, t]);

  return (
    <section
      data-testid="hq-join-strip"
      aria-label={t('academy.hq.getStudentsIn', 'Get students in')}
      className={cn('flex min-w-0 flex-nowrap items-center gap-x-2 px-1', className)}
    >
      <span className="font-neo-display text-[0.65rem] font-bold uppercase tracking-widest text-neo-white/60 max-sm:sr-only">
        {t('academy.hq.classCode', 'Class code')}
      </span>
      <span
        data-testid="hq-join-code"
        dir="ltr"
        className="select-all font-mono text-lg font-black tracking-[0.12em] text-neo-cream sm:text-xl"
      >
        {joinCode}
      </span>
      <span className="font-neo-display text-xs font-bold uppercase text-neo-white/60 max-sm:hidden">
        <span className="tabular-nums text-neo-lime">{studentCount}</span> {t('academy.hq.joinedLabel', 'joined')}
      </span>
      <span className="ms-auto flex shrink-0 items-center">
        <button type="button" data-testid="hq-copy-link" onClick={copyLink} className={QUIET_BUTTON}>
          {copied ? (
            <Check className="size-4 text-neo-lime" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Link2 className="size-4 text-neo-lime" strokeWidth={3} aria-hidden="true" />
          )}
          {t('academy.hq.copyLink', 'Copy link')}
        </button>
        <button type="button" data-testid="hq-open-projector" onClick={onOpenProjector} className={QUIET_BUTTON}>
          <QrCode className="size-4 text-neo-cyan" strokeWidth={2.5} aria-hidden="true" />
          {t('hqCalm.projector')}
        </button>
      </span>
    </section>
  );
}

export default HqJoinStrip;
