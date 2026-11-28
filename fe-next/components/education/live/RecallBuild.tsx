'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Flame, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { comboMultiplier, emptyTally, summarize, tallyAnswer, type RecallSummary } from '@/lib/education/recallScore';
import { RecallSpell } from './RecallSpell';
import { RecallScoreBar } from './RecallScoreBar';
import { RECALL_KEYFRAMES } from './recallStyles';

interface RecallBuildProps {
  cards: StudyCard[];
  onFinish: (summary: RecallSummary) => void;
  t: EduT;
}

const clock = () => Date.now();

/** Lists without meanings: each word is built once from scrambled letters; a fumbled word goes to the back of the line. */
export function RecallBuild({ cards, onFinish, t }: RecallBuildProps) {
  const [queue, setQueue] = useState(() => cards.map((_, i) => i));
  const [tally, setTally] = useState(emptyTally);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState(false);
  const finished = useRef(false);
  const askedAt = useRef(0);
  const answers = tally.correct + tally.wrong;
  const card = queue.length ? cards[queue[0]] : null;
  const clue = card?.definition || card?.hint;

  useEffect(() => {
    askedAt.current = clock();
  }, [answers]);

  useEffect(() => {
    if (finished.current || queue.length) return;
    finished.current = true;
    onFinish(summarize(tally));
  }, [queue, tally, onFinish]);

  const done = (clean: boolean) => {
    const nextStreak = clean ? streak + 1 : 0;
    setTally(tallyAnswer(tally, { correct: clean, streak: nextStreak, kind: 'spell', elapsedMs: clock() - askedAt.current }));
    setStreak(nextStreak);
    setMissed(!clean);
    setQueue(([head, ...rest]) => (clean ? rest : [...rest, head]));
  };

  return (
    <div data-testid="recall-build" className="flex w-full flex-col gap-2">
      <style>{RECALL_KEYFRAMES}</style>
      <RecallScoreBar
        mastered={cards.length - queue.length}
        total={cards.length}
        score={tally.score}
        gained={tally.lastPoints}
        beat={answers}
        multiplier={comboMultiplier(streak)}
        t={t}
      />
      {card && (
        <>
          <div
            key={answers}
            className={cn(
              'flex flex-col gap-1 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-3 text-neo-black shadow-hard',
              answers > 0 && !missed && 'ring-4 ring-neo-lime motion-safe:animate-[recall-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]',
              missed && 'motion-safe:animate-[recall-shake_260ms_ease-in-out]'
            )}
          >
            <p className="font-neo-display text-sm font-black uppercase text-neo-black/70">{t('eduStudent.recall.buildQuestion')}</p>
            <p data-testid="recall-build-word" dir="auto" className="break-words font-neo-display text-[clamp(1.75rem,9cqw,2.5rem)] font-black leading-tight">
              {card.word}
            </p>
            {clue && <p dir="auto" className="font-neo-body text-base leading-snug">{clue}</p>}
          </div>
          <span aria-live="polite" className="sr-only">
            {answers > 0 ? t(missed ? 'eduStudent.recall.wrongComeback' : 'eduStudent.recall.correct') : ''}
          </span>
          {missed ? (
            <p data-testid="recall-build-retry" className="inline-flex items-center gap-1.5 font-neo-body text-sm font-bold text-neo-cream/85 edu-sky:text-edu-ink/85">
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
              {t('eduStudent.recall.wrongComeback')}
            </p>
          ) : (
            answers > 0 && (
              <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
                <span className="inline-flex items-center gap-1 font-neo-display text-base font-black text-neo-lime edu-sky:text-edu-lime-ink">
                  <Check className="size-5" strokeWidth={3} />
                  {t('eduStudent.recall.correct')}
                </span>
                {streak >= 2 && (
                  <span
                    key={streak}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm motion-safe:animate-[recall-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]"
                  >
                    <Flame className="size-4" />
                    {t('eduStudent.recall.streak', { count: streak })}
                  </span>
                )}
              </div>
            )
          )}
          <RecallSpell key={`${queue[0]}-${answers}`} word={card.word} seed={answers * 7 + queue[0] + cards.length} onDone={done} />
        </>
      )}
    </div>
  );
}
