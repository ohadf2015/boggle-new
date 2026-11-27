'use client';

import { useMemo, useState } from 'react';
import { PartyPopper, RotateCcw } from 'lucide-react';
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

function missedItems(missed: readonly string[], deck: readonly StudyCard[]) {
  const wanted = new Set(missed.map((w) => w.toLowerCase()));
  return quizzableCards(deck).filter((i) => wanted.has(i.word.toLowerCase()));
}

const deckPool = (deck: readonly StudyCard[]) => [...new Set(deck.map((c) => c.word.toLowerCase()))];

export function canRecallMissed(missed: readonly string[], deck: readonly StudyCard[]): boolean {
  return missedItems(missed, deck).length > 0 && deckPool(deck).length >= 2;
}

export function EduMissedRecall({ missed, deck, t }: EduMissedRecallProps) {
  const items = useMemo(() => missedItems(missed, deck), [missed, deck]);
  const pool = useMemo(() => deckPool(deck), [deck]);
  const [phase, setPhase] = useState<'quiz' | 'done'>('quiz');
  const [round, setRound] = useState(0);

  if (items.length === 0 || pool.length < 2) return null;

  return (
    <section data-testid="missed-recall" className="flex w-full flex-col gap-2">
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
            className={cn(BUTTON, PRESS, 'border-edu-line bg-edu-surface text-edu-ink')}
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            {t('eduStudent.recall.practiceAgain')}
          </button>
        </div>
      )}
    </section>
  );
}
