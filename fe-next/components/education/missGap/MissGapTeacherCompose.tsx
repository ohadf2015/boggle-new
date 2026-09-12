/**
 * Teacher compose block — pick a due date, send the link.
 *
 * ONE dominant action: share. Google Classroom is the same link in a different
 * envelope, so it sits below as a secondary (decision-fatigue rule: one primary
 * action per screen, and never a second CTA cluster beneath it).
 *
 * ONE root element with the classes it had inline — this renders inside the
 * compose `<section>`, and an extra wrapper changes the `space-y-3` rhythm the
 * 1440x900 fold budget was measured against.
 *
 * `border-[3px]` sits next to each colour class deliberately: tailwind-merge
 * treats `border-neo` (width) as the same group as `border-neo-<colour>` and
 * drops the width, which preflight then renders as no border at all.
 */
'use client';

import { useMemo, useState } from 'react';
import { Calendar, Check, GraduationCap, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { shareWithFallback } from '@/utils/shareWithFallback';
import {
  buildMissGapAssignmentGoogleClassroomUrl,
  buildMissGapAssignmentShareUrl,
  type MissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';

export interface MissGapTeacherComposeProps {
  payload: MissGapAssignmentPayload;
  lesson: string;
  dueDate: string;
  onDueDateChange: (next: string) => void;
}

export function MissGapTeacherCompose({
  payload,
  lesson,
  dueDate,
  onDueDateChange,
}: MissGapTeacherComposeProps) {
  const { t } = useLanguage();
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const words = payload.missedWords;

  const googleClassroomHref = useMemo(() => {
    if (words.length === 0 || !payload.dueDate) return null;
    try {
      const missed = words.slice(0, 8).join(', ');
      return buildMissGapAssignmentGoogleClassroomUrl({
        input: payload,
        title: t('education.results.assignMissGapAsyncTitle', { lesson }),
        body: t('education.results.assignMissGapAsyncBody', {
          missed,
          due: payload.dueDate,
        }),
      });
    } catch {
      return null;
    }
  }, [words, payload, t, lesson]);

  const handleShare = async () => {
    if (words.length === 0 || !payload.dueDate) return;
    const url = buildMissGapAssignmentShareUrl(payload);
    const text = t('education.results.assignMissGapAsyncShareText', {
      lesson,
      missed: words.join(', '),
      due: payload.dueDate,
    });
    const result = await shareWithFallback({
      title: t('education.results.assignMissGapAsyncTitle', { lesson }),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  return (
    <div className="mt-5 space-y-3">
      <label className="block">
        <span className="flex items-center gap-2 text-neo-white font-bold text-sm mb-2">
          <Calendar className="w-4 h-4" aria-hidden />
          {t('education.results.assignMissGapAsyncDueLabel')}
        </span>
        <input
          type="date"
          data-testid="miss-gap-async-due-date"
          value={dueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
          className="w-full px-3 py-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-white font-neo-body"
        />
      </label>

      <button
        type="button"
        data-testid="share-miss-gap-async-homework"
        onClick={handleShare}
        disabled={!payload.dueDate}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-4',
          'font-neo-display font-bold text-lg',
          'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
          'shadow-hard hover:shadow-hard-lg transition-all',
          !payload.dueDate && 'opacity-60 cursor-not-allowed',
        )}
      >
        {shareState === 'idle' ? (
          <>
            <Share2 className="w-5 h-5" aria-hidden />
            {t('education.results.assignMissGapAsyncShare')}
          </>
        ) : (
          <>
            <Check className="w-5 h-5" aria-hidden />
            {t('education.results.assignMissGapAsyncShareCopied')}
          </>
        )}
      </button>

      {googleClassroomHref ? (
        <a
          href={googleClassroomHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="assign-miss-gap-async-google-classroom"
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cream text-neo-black border-[3px] border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          <GraduationCap className="w-5 h-5" aria-hidden />
          {t('education.results.assignMissGapAsyncGoogleClassroom')}
        </a>
      ) : null}
    </div>
  );
}
