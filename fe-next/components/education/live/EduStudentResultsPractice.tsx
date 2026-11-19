'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';
import { spellableWords } from '@/components/education/lobby/warmUpSpell';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import { EduMissedRecall, canRecallMissed } from './EduMissedRecall';
import { PRESS, type Translate } from './eduLiveStyles';

export type MissedPracticeKind = 'recall' | 'spell';

export function missedPracticeKind(missed: readonly string[], deck: readonly StudyCard[]): MissedPracticeKind | null {
  if (missed.length === 0) return null;
  if (canRecallMissed(missed, deck)) return 'recall';
  return spellableWords(missed).length > 0 ? 'spell' : null;
}

interface EduStudentResultsPracticeProps {
  kind: MissedPracticeKind;
  missed: string[];
  deck: StudyCard[];
  username: string;
  onBack: () => void;
  t: Translate;
}

/** Practice stays inside the results screen: the teacher's next round can only reach a student who is still in the room. */
export function EduStudentResultsPractice({ kind, missed, deck, username, onBack, t }: EduStudentResultsPracticeProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section data-testid="edu-student-practice" aria-labelledby="edu-student-practice-title" className="flex w-full max-w-xl flex-col gap-4 rounded-neo-lg border-4 border-neo-cream bg-neo-navy p-4 shadow-hard-lg lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 id="edu-student-practice-title" ref={heading} tabIndex={-1} className="min-w-0 font-neo-display text-2xl font-black leading-tight outline-none lg:text-3xl">
          {t('education.results.practiceMissed')}
        </h1>
        <button
          type="button"
          data-testid="edu-student-practice-back"
          onClick={onBack}
          className={cn('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 font-neo-display text-sm font-black shadow-hard-sm hover:bg-neo-navy-light', PRESS)}
        >
          <DirectionalIcon icon={ArrowLeft} className="size-4" />
          {t('eduLiveRoom.studentResults.backToResults')}
        </button>
      </div>
      {kind === 'recall' ? <EduMissedRecall missed={missed} deck={deck} t={t} /> : <WaitingWarmUp username={username} words={missed} t={t} hero />}
    </section>
  );
}
