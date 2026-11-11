'use client';

import { Users } from 'lucide-react';
import XpProgressBar from '@/components/education/XpProgressBar';
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
