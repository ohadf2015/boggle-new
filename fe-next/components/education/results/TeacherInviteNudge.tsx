'use client';

import { MessageCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { trackEduTeacherInviteShared } from '@/lib/education/shareTelemetry';
import { PRESS, type Translate } from '@/components/education/live/eduLiveStyles';

const MIN_STUDENTS = 3;

export function showTeacherInvite(celebrate: boolean, students: number): boolean {
  return celebrate && students >= MIN_STUDENTS;
}

function landingUrl(language: string): string {
  return `${window.location.origin}/${language}/education?utm_source=teacher_invite&utm_medium=referral`;
}

const ROW_BUTTON =
  'inline-flex min-h-11 items-center gap-1.5 rounded-neo border-2 border-neo-cream/60 px-3 font-neo-display text-xs font-bold text-neo-cream hover:bg-neo-navy-light';

/** WhatsApp only on the teacher's own phone: on a projected laptop it would open their chat list in front of the class. */
export function TeacherInviteNudge({ students, language, whatsapp = false, compact = false, t }: { students: number; language: string; whatsapp?: boolean; compact?: boolean; t: Translate }) {
  const text = t('eduLiveRoom.hostResults.inviteText');
  const share = async () => {
    const outcome = await shareOrCopy({ title: 'LexiClash', text, url: landingUrl(language) });
    if (outcome === 'native' || outcome === 'copy') trackEduTeacherInviteShared({ method: outcome, students });
    if (outcome === 'copy') toast.success(t('share.linkCopied'));
    if (outcome === 'failed') toast.error(t('errors.generic'));
  };
  const whatsappHref = typeof window === 'undefined' ? undefined : `https://wa.me/?text=${encodeURIComponent(`${text} ${landingUrl(language)}`)}`;

  return (
    <div
      data-testid="teacher-invite"
      data-density={compact ? 'compact' : undefined}
      className={cn('flex items-center gap-2', compact ? '[&>*]:min-w-0 [&>*]:flex-1 [&>*]:justify-center' : 'flex-wrap rounded-neo border-2 border-dashed border-neo-cream/40 px-3 py-2')}
    >
      {!compact && <p className="min-w-0 flex-1 font-neo-body text-sm font-bold text-neo-cream/85">{t('eduLiveRoom.hostResults.invitePrompt')}</p>}
      <button type="button" data-testid="teacher-invite-share" onClick={() => void share()} className={cn(ROW_BUTTON, PRESS)}>
        <Share2 className="size-4" aria-hidden="true" />
        {t('eduLiveRoom.hostResults.inviteCta')}
      </button>
      {whatsapp && (
      <a
        data-testid="teacher-invite-whatsapp"
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEduTeacherInviteShared({ method: 'whatsapp', students })}
        className={cn(ROW_BUTTON, PRESS)}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {t('share.whatsapp')}
      </a>
      )}
    </div>
  );
}
