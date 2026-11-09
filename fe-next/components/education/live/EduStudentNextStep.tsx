'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { StudentNextActions } from '@/components/education/results/StudentNextActions';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { trackEduStudentResultShared } from '@/lib/education/shareTelemetry';
import { PRESS, type Translate } from './eduLiveStyles';

type Placing = { rank: number; total: number; score: number } | null;

interface EduStudentNextStepProps {
  t: Translate;
  placing: Placing;
  onPractice?: () => void;
  /** Round one only: from round two the momentum chips already say what to beat. */
  showTomorrow?: boolean;
}

export function EduStudentNextStep({ t, placing, onPractice, showTomorrow = true }: EduStudentNextStepProps) {
  return (
    <div data-testid="edu-student-next-step" className="flex w-full flex-col gap-1.5">
      <StudentNextActions onPractice={onPractice} t={t} compact />
      {placing && showTomorrow && (
        <p data-testid="edu-student-tomorrow" className="min-w-0 font-neo-body text-xs font-bold leading-snug text-neo-cream/85">
          {t('eduLiveRoom.studentResults.tomorrowHook', { score: placing.score })}
        </p>
      )}
    </div>
  );
}

/** The share carries rank and score only: a child's name, class and room code never leave the phone. The link lands on the ad-free class join page, never the consumer game. */
export function EduStudentShareButton({ t, language, placing }: { t: Translate; language: string; placing: Placing }) {
  if (!placing) return null;
  const share = async () => {
    const outcome = await shareOrCopy({
      title: 'LexiClash',
      text: t('eduLiveRoom.studentResults.shareText', { rank: placing.rank, total: placing.total, score: placing.score }),
      url: `${window.location.origin}/${language}/join?utm_source=edu_student_share&utm_medium=referral`,
    });
    if (outcome === 'native' || outcome === 'copy') trackEduStudentResultShared({ method: outcome });
    if (outcome === 'copy') toast.success(t('share.linkCopied'));
    if (outcome === 'failed') toast.error(t('errors.generic'));
  };
  return (
    <button
      type="button"
      data-testid="edu-student-share"
      aria-label={t('eduLiveRoom.studentResults.share')}
      title={t('eduLiveRoom.studentResults.share')}
      onClick={() => void share()}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated text-neo-cream shadow-hard-sm hover:bg-neo-navy-light',
        PRESS
      )}
    >
      <Share2 className="size-5" aria-hidden="true" />
    </button>
  );
}
