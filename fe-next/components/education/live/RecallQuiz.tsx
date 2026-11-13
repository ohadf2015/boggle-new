'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Flame } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { EduT } from '@/components/education/lobby/eduText';
import { answerRecall, isRecallFinished, masteredCount, startRecall, type RecallItem, type Rng } from '@/lib/education/recallQuiz';
import { PRESS } from './eduLiveStyles';
import { RecallSpell } from './RecallSpell';

interface RecallQuizProps {
  items: RecallItem[];
  pool: string[];
  target: number;
  onFinish: () => void;
  t: EduT;
  rng?: Rng;
}

const BUTTON = 'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-neo border-[3px] border-neo-black px-3 font-neo-display text-base font-black shadow-hard-sm';

export function RecallQuiz({ items, pool, target, onFinish, t, rng = Math.random }: RecallQuizProps) {
  const [state, setState] = useState(() => startRecall(items, { pool, target, rng }));
  const [reviewing, setReviewing] = useState(false);
  const finished = useRef(false);
  const total = Object.keys(state.items).length;
  const mastered = masteredCount(state);
  const last = state.last;

  useEffect(() => {
    if (finished.current || reviewing || !isRecallFinished(state)) return;
    finished.current = true;
    onFinish();
  }, [state, reviewing, onFinish]);

  const pick = (choice: string) => {
    const next = answerRecall(state, choice, rng);
    setState(next);
    if (!next.last?.correct) setReviewing(true);
  };

  return (
    <div data-testid="recall-quiz" className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span data-testid="recall-progress" className="font-neo-display text-sm font-bold tabular-nums text-neo-cream/80">
          {t('eduStudent.recall.progress', { mastered, total })}
        </span>
        {last?.correct && state.streak >= 2 && (
          <span
            data-testid="recall-streak"
            key={state.streak}
            className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm motion-safe:animate-[edu-live-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]"
          >
            <Flame className="size-4" aria-hidden="true" />
            {t('eduStudent.recall.streak', { count: state.streak })}
          </span>
        )}
      </div>
      <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full border-2 border-neo-cream/40 bg-neo-navy-light">
        <div className="h-full bg-neo-lime transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} />
      </div>

      {reviewing && last ? (
        <div data-testid="recall-feedback-wrong" role="status" className="flex flex-col gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-4 text-neo-black shadow-hard">
          <p className="font-neo-display text-sm font-black uppercase text-neo-pink">{t('eduStudent.recall.wrongLead')}</p>
          <p dir="auto" className="break-words font-neo-display text-[clamp(1.5rem,8cqw,2.25rem)] font-black leading-tight">{last.word}</p>
          <p dir="auto" className="font-neo-body text-base leading-snug">{last.definition}</p>
          <button type="button" data-testid="recall-next" autoFocus onClick={() => setReviewing(false)} className={cn(BUTTON, PRESS, 'mt-1 bg-neo-cyan uppercase')}>
            {t('eduStudent.recall.next')}
            <DirectionalIcon icon={ArrowRight} className="size-5" />
          </button>
        </div>
      ) : (
        state.question && (
          <>
            <div
              key={`${state.question.word}-${state.queue.length}-${mastered}`}
              className={cn(
                'flex min-h-28 flex-col justify-center gap-1.5 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-4 text-neo-black shadow-hard',
                last?.correct ? 'ring-4 ring-neo-lime motion-safe:animate-[edu-live-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]' : ''
              )}
            >
              <p className="font-neo-display text-sm font-black uppercase text-neo-black/70">
                {t(state.question.kind === 'spell' ? 'eduStudent.recall.spellQuestion' : 'eduStudent.recall.question')}
              </p>
              <p data-testid="recall-definition" dir="auto" className="font-neo-body text-lg font-bold leading-snug">{state.question.definition}</p>
            </div>
            <span aria-live="polite" className="sr-only">
              {last?.correct ? t('eduStudent.recall.correct') : ''}
            </span>
            {last?.correct && (
              <span data-testid="recall-correct" aria-hidden="true" className="inline-flex items-center gap-1 self-start font-neo-display text-sm font-black text-neo-lime">
                <Check className="size-4" />
                {t('eduStudent.recall.correct')}
              </span>
            )}
            {state.question.kind === 'spell' ? (
              <RecallSpell
                key={`spell-${state.question.word}-${state.queue.length}-${mastered}`}
                word={state.question.word}
                seed={state.queue.length + mastered * 7 + total}
                onDone={(clean) => pick(clean ? state.question!.word : '')}
              />
            ) : (
              <div data-testid="recall-options" className="grid grid-cols-2 gap-2">
                {state.question.options.map((word) => (
                  <button key={word} type="button" dir="auto" onClick={() => pick(word)} className={cn(BUTTON, PRESS, 'break-words bg-neo-cream py-2 text-neo-black hover:bg-neo-yellow')}>
                    {word}
                  </button>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
