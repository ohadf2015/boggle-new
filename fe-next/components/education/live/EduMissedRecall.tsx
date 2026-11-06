'use client';

import { useMemo, useState } from 'react';
import { Brain, PartyPopper, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { quizzableCards } from '@/lib/education/recallQuiz';
import { RecallQuiz } from './RecallQuiz';
import { PRESS } from './eduLiveStyles';

interface EduMissedRecallProps {
  missed: string[];
  deck: StudyCard[];
  t: EduT;
}

const BUTTON = 'inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-neo border-[3px] border-neo-black px-4 font-neo-display text-base font-black uppercase shadow-hard-sm';

export function missedDefinitions(missed: readonly string[], deck: readonly StudyCard[]): Record<string, string> {
  const wanted = new Set(missed.map((w) => w.toLowerCase()));
  const out: Record<string, string> = {};
  for (const item of quizzableCards(deck)) {
    const key = item.word.toLowerCase();
    if (wanted.has(key)) out[key] = item.definition;
  }
  return out;
}

export function EduMissedRecall({ missed, deck, t }: EduMissedRecallProps) {
  const items = useMemo(() => {
    const wanted = new Set(missed.map((w) => w.toLowerCase()));
    return quizzableCards(deck).filter((i) => wanted.has(i.word.toLowerCase()));
  }, [missed, deck]);
  const pool = useMemo(() => [...new Set(deck.map((c) => c.word.toLowerCase()))], [deck]);
  const [phase, setPhase] = useState<'idle' | 'quiz' | 'done'>('idle');
  const [round, setRound] = useState(0);

  if (items.length === 0 || pool.length < 2) return null;

  return (
    <section data-testid="missed-recall" className="flex w-full flex-col gap-2">
      {phase === 'idle' && (
        <button type="button" data-testid="missed-recall-start" onClick={() => setPhase('quiz')} className={cn(BUTTON, PRESS, 'bg-neo-cyan text-neo-black')}>
          <Brain className="size-5" aria-hidden="true" />
          {t('eduStudent.recall.quickRecall')}
        </button>
      )}
      {phase === 'quiz' && (
        <RecallQuiz key={round} items={items} pool={deck.map((c) => c.word)} target={1} onFinish={() => setPhase('done')} t={t} />
      )}
      {phase === 'done' && (
        <div data-testid="missed-recall-done" role="status" className="flex flex-col gap-2">
          <p className="flex items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-3 py-2 font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
            <PartyPopper className="size-5 shrink-0" aria-hidden="true" />
            {t('eduStudent.recall.finished')}
          </p>
          <button
            type="button"
            onClick={() => {
              setRound((r) => r + 1);
              setPhase('quiz');
            }}
            className={cn(BUTTON, PRESS, 'border-neo-cream/40 bg-neo-navy-light text-neo-cream')}
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            {t('eduStudent.recall.practiceAgain')}
          </button>
        </div>
      )}
    </section>
  );
}
