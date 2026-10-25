'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { StudentNextActions } from '@/components/education/results/StudentNextActions';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { trackEduStudentResultShared } from '@/lib/education/shareTelemetry';
import { PRESS, type Translate } from './eduLiveStyles';

interface EduStudentNextStepProps {
  t: Translate;
  language: string;
  placing: { rank: number; total: number; score: number } | null;
  onPractice?: () => void;
}

/**
 * The phone's one next step after a teacher-paced round: stay for the next game (it arrives here
 * on its own), with practice, a tomorrow target and a share card as quieter options below it.
 * The share carries rank and score only; a child's name, class and room code never leave the phone.
 */
export function EduStudentNextStep({ t, language, placing, onPractice }: EduStudentNextStepProps) {
  const share = async () => {
    if (!placing) return;
    const outcome = await shareOrCopy({
      title: 'LexiClash',
      text: t('eduLiveRoom.studentResults.shareText', { rank: placing.rank, total: placing.total, score: placing.score }),
      url: `${window.location.origin}/${language}/daily?utm_source=edu_student_share&utm_medium=referral`,
    });
    if (outcome === 'native' || outcome === 'copy') trackEduStudentResultShared({ method: outcome });
    if (outcome === 'copy') toast.success(t('share.linkCopied'));
    if (outcome === 'failed') toast.error(t('errors.generic'));
  };

  return (
    <div data-testid="edu-student-next-step" className="flex w-full flex-col gap-2">
      <StudentNextActions onPractice={onPractice} t={t} />
      {placing && (
        <div className="flex items-center justify-between gap-2">
          <p data-testid="edu-student-tomorrow" className="min-w-0 font-neo-body text-sm font-bold text-neo-cream/85">
            {t('eduLiveRoom.studentResults.tomorrowHook', { score: placing.score })}
          </p>
          <button
            type="button"
            data-testid="edu-student-share"
            onClick={() => void share()}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-neo border-2 border-neo-cream/60 px-3 font-neo-display text-xs font-black uppercase text-neo-cream hover:bg-neo-navy-light',
              PRESS
            )}
          >
            <Share2 className="size-4" aria-hidden="true" />
            {t('eduLiveRoom.studentResults.share')}
          </button>
        </div>
      )}
    </div>
  );
}
