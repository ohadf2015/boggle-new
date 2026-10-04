'use client';

/**
 * Empty-roster primary CTA on the teacher class student list.
 * Surfaces the #1207 join code + join-link (copy + share). Hidden once any student has joined.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, Share2, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import {
  trackEduJoinCodeCopied,
  trackTeacherInviteStudentsCtaClicked,
  trackTeacherInviteStudentsCtaViewed,
} from '@/lib/education/telemetry';
import { shareWithFallback } from '@/utils/shareWithFallback';

export const TEACHER_INVITE_STUDENTS_CTA_TESTID = 'teacher-invite-students-cta';

export interface InviteStudentsCtaProps {
  classroomId: string;
  joinCode: string;
  /** Null while the roster is unresolved — unknown must not look like zero. */
  studentCount: number | null;
}

export function InviteStudentsCta({
  classroomId,
  joinCode,
  studentCount,
}: InviteStudentsCtaProps) {
  const { t, language } = useLanguage();
  const show = studentCount === 0;
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!show) return;
    trackTeacherInviteStudentsCtaViewed({ classroomId });
  }, [show, classroomId]);

  const joinUrl = origin ? classroomJoinUrl(origin, language, joinCode) : '';

  const copyLink = useCallback(async () => {
    const url = classroomJoinUrl(window.location.origin, language, joinCode);
    try {
      await navigator.clipboard.writeText(url);
      trackEduJoinCodeCopied({ classroomId });
      toast.success(t('teacher.classroom.linkCopied'));
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [classroomId, joinCode, language, t]);

  const shareLink = useCallback(async () => {
    const url = classroomJoinUrl(window.location.origin, language, joinCode);
    const result = await shareWithFallback({
      title: t('teacher.classroom.inviteStudents', 'Invite students'),
      text: t(
        'teacher.classroom.shareInviteText',
        'Join {{name}} on LexiClash with code {{code}}',
        { name: joinCode, code: joinCode },
      ),
      url,
      clipboardText: url,
    });
    if (result === 'copied') {
      trackEduJoinCodeCopied({ classroomId });
      toast.success(t('teacher.classroom.linkCopied'));
    }
  }, [classroomId, joinCode, language, t]);

  const onInvite = useCallback(async () => {
    trackTeacherInviteStudentsCtaClicked({ classroomId });
    await shareLink();
  }, [classroomId, shareLink]);

  if (!show) return null;

  return (
    <div
      data-testid="invite-students-empty-roster"
      className="border-3 border-black rounded-neo p-6 text-center bg-neo-cream shadow-hard-sm"
    >
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan shadow-hard-sm">
        <Users className="h-8 w-8 text-black" aria-hidden="true" />
      </div>
      <p className="mb-1 font-neo-body font-bold text-black">
        {t('teacher.classrooms.students.empty')}
      </p>
      <p className="mb-4 text-sm font-bold text-black/60">
        {t('teacher.classrooms.students.emptyHint', { code: joinCode })}
      </p>
      <div className="mx-auto mb-4 flex max-w-xs flex-col items-center rounded-neo border-3 border-black bg-white px-3 py-2 shadow-hard-sm">
        <span className="font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-black/60">
          {t('teacher.classroom.joinCode')}
        </span>
        <code
          data-testid="invite-students-join-code"
          dir="ltr"
          className="select-all font-mono text-3xl font-black tracking-[0.1em] text-black"
        >
          {joinCode}
        </code>
        {joinUrl ? (
          <span dir="ltr" className="mt-1 max-w-full truncate font-mono text-xs font-bold text-black/50">
            {joinUrl.replace(/^https?:\/\//, '')}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        data-testid={TEACHER_INVITE_STUDENTS_CTA_TESTID}
        onClick={() => void onInvite()}
        className="inline-flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        {t('teacher.classroom.inviteStudents', 'Invite students')}
      </button>
      <div className="mx-auto mt-3 grid w-full max-w-xs grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="invite-students-copy-link"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy px-2 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream shadow-hard-sm hover:-translate-y-0.5 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <Link2 className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('teacher.classroom.copyLink', 'Copy invite link')}
        </button>
        <button
          type="button"
          data-testid="invite-students-share"
          onClick={() => void shareLink()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-black bg-white px-2 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm hover:-translate-y-0.5 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <Share2 className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('teacher.classroom.share', 'Share')}
        </button>
      </div>
    </div>
  );
}

export default InviteStudentsCta;
