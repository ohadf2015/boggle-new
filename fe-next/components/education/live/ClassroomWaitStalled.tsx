'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { classroomStudentHomePath } from '@/lib/education/classroomRoomGone';
import { PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON, type Translate } from './eduLiveStyles';

interface Props {
  language: string;
  onRetry?: () => void;
  t: Translate;
}

/** A classroom wait that outlived a minute: say so, and give the student two ways forward. */
export default function ClassroomWaitStalled({ language, onRetry, t }: Props) {
  return (
    <div data-testid="classroom-wait-stalled" className="flex w-full flex-col items-center gap-3">
      <h1 role="status" aria-live="polite" className="font-neo-display text-2xl font-black">{t('eduLiveRoom.entry.waitStalledTitle')}</h1>
      <p className="font-neo-body text-base font-bold text-neo-cream/80">{t('eduLiveRoom.entry.waitStalledHint')}</p>
      <button type="button" data-testid="classroom-wait-retry" onClick={onRetry} className={cn(PRIMARY_BUTTON, PRESS, 'min-h-12 w-full px-5 text-lg')}>
        {t('eduLiveRoom.entry.waitStalledRetry')}
      </button>
      <Link href={classroomStudentHomePath(language)} data-testid="classroom-wait-to-class" className={cn(SECONDARY_BUTTON, PRESS, 'min-h-12 w-full px-5 text-lg')}>
        {t('eduLiveRoom.entry.waitStalledToClass')}
      </Link>
    </div>
  );
}
