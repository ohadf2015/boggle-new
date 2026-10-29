'use client';

import { Users } from 'lucide-react';
import XpProgressBar from '@/components/education/XpProgressBar';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import type { Translate } from './eduLiveStyles';

const CARD = 'rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated p-3 shadow-hard';

export function EduStudentXpBar({ totalXp }: { totalXp: number }) {
  return (
    <div data-testid="edu-student-xp-bar" className={CARD}>
      <XpProgressBar totalXp={totalXp} size="sm" showNextLevel={false} />
    </div>
  );
}

export function EduStudentClassGoal({ found, total, t }: { found: number; total: number; t: Translate }) {
  return (
    <p
      data-testid="edu-student-class-goal"
      className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-sm font-black text-neo-black shadow-hard-sm"
    >
      <Users className="size-4 shrink-0" aria-hidden="true" />
      {t('eduLiveRoom.studentResults.classGoal', { found, total })}
    </p>
  );
}

export function EduStudentWaitNext({ username, t }: { username: string; t: Translate }) {
  return (
    <section data-testid="edu-student-wait-next" className={`${CARD} flex flex-col items-center gap-2`}>
      <div className="flex w-full items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
        <img src={EDU_MASCOT.warmup} alt="" aria-hidden="true" className="size-12 shrink-0 select-none" />
        <p role="status" className="min-w-0 font-neo-body text-sm font-bold text-neo-cream">
          {t('eduLiveRoom.studentResults.waitNext')}
        </p>
      </div>
      <WaitingWarmUp username={username} t={t} />
    </section>
  );
}
