/**
 * TeacherActivationNudge — the dashboard's next activation move.
 *
 * Two honest states, never both, never a guess:
 *   shareJoin        empty roster, code in hand — paste the student-join link
 *   firstAssignment  students on the roster, zero assignments — create one
 *
 * The derivation lives in `teacherActivationStep`. This file is the card and
 * the live wrapper that refuses to treat a failed assignment read as zero.
 */
'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import { classroomInvitePayload, classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { teacherActivationStep } from '@/lib/education/teacherActivation';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { shareWithFallback } from '@/utils/shareWithFallback';

export interface TeacherActivationNudgeProps {
  rosterCount: number;
  /** `null` = unknown. A failed or in-flight read must arrive as null. */
  assignmentCount: number | null;
  joinCode?: string | null;
  onCreateAssignment: () => void;
  className?: string;
}

export function TeacherActivationNudge({
  rosterCount,
  assignmentCount,
  joinCode,
  onCreateAssignment,
  className,
}: TeacherActivationNudgeProps) {
  const { t, language } = useLanguage();
  const step = teacherActivationStep({ rosterCount, assignmentCount, joinCode });
  if (!step) return null;

  const code = (joinCode ?? '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = code && origin ? classroomJoinUrl(origin, language, code) : '';

  const copyInvite = () => {
    if (!code) return;
    navigator.clipboard
      .writeText(classroomInvitePayload(origin, language, code))
      .then(() => toast.success(t('teacher.classroom.codeCopied')))
      .catch(() => toast.error(t('share.codeCopyError')));
  };

  const shareInvite = async () => {
    if (!code || !joinUrl) return;
    const result = await shareWithFallback({
      title: t('teacher.activation.shareTitle'),
      text: t('teacher.activation.shareBody'),
      url: joinUrl,
      clipboardText: classroomInvitePayload(origin, language, code),
    });
    if (result === 'copied') toast.success(t('teacher.classroom.linkCopied'));
  };

  return (
    <NeoPanel
      tone="navy"
      shadow="md"
      data-testid="teacher-activation-nudge"
      data-step={step}
      className={cn('p-4', className)}
    >
      {step === 'shareJoin' ? (
        <>
          <p className="font-neo-display text-base font-black uppercase tracking-tight text-neo-white">
            {t('teacher.activation.shareTitle')}
          </p>
          <p className="mt-1 font-neo-body text-xs font-bold text-neo-white/70 text-pretty">
            {t('teacher.activation.shareBody')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code
              data-testid="teacher-activation-join-code"
              className="rounded-neo border-3 border-black bg-neo-lime px-3 py-2 font-mono text-lg font-black tracking-widest text-black shadow-hard-sm"
            >
              {code}
            </code>
            <button
              type="button"
              data-testid="teacher-activation-copy"
              onClick={copyInvite}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-black bg-neo-cyan px-3 py-2',
                'font-neo-display text-xs font-black uppercase text-black shadow-hard-sm',
                'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
                'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
              )}
            >
              <Copy className="size-4 shrink-0" aria-hidden="true" />
              {t('teacher.activation.copyLink')}
            </button>
            <button
              type="button"
              data-testid="teacher-activation-share"
              onClick={() => void shareInvite()}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-cream bg-neo-navy-light px-3 py-2',
                'font-neo-display text-xs font-black uppercase text-neo-white shadow-hard-sm',
                'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
                'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              )}
            >
              <Link2 className="size-4 shrink-0" aria-hidden="true" />
              {t('teacher.activation.share')}
            </button>
          </div>
          {joinUrl ? (
            <p
              data-testid="teacher-activation-join-url"
              className="mt-2 truncate font-neo-body text-[11px] font-bold text-neo-white/50"
            >
              {joinUrl}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="font-neo-display text-base font-black uppercase tracking-tight text-neo-white">
            {t('teacher.activation.firstAssignmentTitle')}
          </p>
          <p className="mt-1 font-neo-body text-xs font-bold text-neo-white/70 text-pretty">
            {t('teacher.activation.firstAssignmentBody')}
          </p>
          <button
            type="button"
            data-testid="teacher-activation-assign"
            onClick={onCreateAssignment}
            className={cn(
              'mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-3 border-black',
              'bg-neo-pink px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            )}
          >
            <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
            {t('teacher.activation.firstAssignmentCta')}
          </button>
        </>
      )}
    </NeoPanel>
  );
}

export interface TeacherActivationNudgeLiveProps {
  classroomId: string;
  rosterCount: number;
  joinCode?: string | null;
  onCreateAssignment: () => void;
  className?: string;
}

/**
 * Live wrapper. Assignment count starts unknown and stays unknown on error,
 * so a network blip cannot look like "this class has never assigned".
 */
export function TeacherActivationNudgeLive({
  classroomId,
  rosterCount,
  joinCode,
  onCreateAssignment,
  className,
}: TeacherActivationNudgeLiveProps) {
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);

  useEffect(() => {
    if (rosterCount <= 0) {
      setAssignmentCount(null);
      return;
    }
    let cancelled = false;
    setAssignmentCount(null);
    void getClassroomAssignments(classroomId).then((res) => {
      if (cancelled) return;
      if (res.error) return;
      setAssignmentCount(res.data.length);
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId, rosterCount]);

  return (
    <TeacherActivationNudge
      rosterCount={rosterCount}
      assignmentCount={assignmentCount}
      joinCode={joinCode}
      onCreateAssignment={onCreateAssignment}
      className={className}
    />
  );
}

export default TeacherActivationNudgeLive;
