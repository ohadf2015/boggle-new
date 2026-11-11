'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { trackEduStudentResultShared } from '@/lib/education/shareTelemetry';
import { PRESS, type Translate } from './eduLiveStyles';

type Placing = { rank: number; total: number; score: number } | null;

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
