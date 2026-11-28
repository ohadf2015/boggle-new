'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Flame, Lightbulb } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { EduT } from '@/components/education/lobby/eduText';
import { answerRecall, isRecallFinished, masteredCount, startRecall, type RecallItem, type Rng } from '@/lib/education/recallQuiz';
import { bonusWindowMs, comboMultiplier, emptyTally, summarize, tallyAnswer, type RecallSummary } from '@/lib/education/recallScore';
import { pulseLive } from '@/lib/education/liveHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { PRESS } from './eduLiveStyles';
import { RecallSpell } from './RecallSpell';
import { RecallScoreBar } from './RecallScoreBar';
import { RECALL_FILLS, RECALL_KEYFRAMES, RECALL_TILE } from './recallStyles';

interface RecallQuizProps {
  items: RecallItem[];
  pool: string[];
  target: number;
  onFinish: (summary: RecallSummary) => void;
  t: EduT;
  rng?: Rng;
}

const clock = () => Date.now();

const BUTTON = 'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-neo border-[3px] border-neo-black px-3 font-neo-display text-base font-black shadow-hard-sm';

export function RecallQuiz({ items, pool, target, onFinish, t, rng = Math.random }: RecallQuizProps) {
  const [state, setState] = useState(() => startRecall(items, { pool, target, rng }));
  const [tally, setTally] = useState(emptyTally);
  const [reviewing, setReviewing] = useState(false);
  const finished = useRef(false);
  const askedAt = useRef(0);
  const sfx = useSoundEffects();
  const [reducedEffects] = useReducedEffects();
  const total = Object.keys(state.items).length;
  const mastered = masteredCount(state);
  const last = state.last;
  const answers = tally.correct + tally.wrong;
  const qKey = state.question ? `${state.question.word}-${state.queue.length}-${mastered}` : 'done';
  const multiplier = last?.correct ? comboMultiplier(state.streak) : 1;

  useEffect(() => {
    if (!reviewing) askedAt.current = clock();
  }, [qKey, reviewing]);

  useEffect(() => {
    if (finished.current || reviewing || !isRecallFinished(state)) return;
    finished.current = true;
    onFinish(summarize(tally));
  }, [state, tally, reviewing, onFinish]);

  const pick = (choice: string) => {
    const kind = state.question?.kind ?? 'pick';
    const next = answerRecall(state, choice, rng);
    const correct = Boolean(next.last?.correct);
    setState(next);
    setTally(tallyAnswer(tally, { correct, streak: next.streak, kind, elapsedMs: clock() - askedAt.current }));
    if (!correct) {
      setReviewing(true);
      return;
    }
    if (kind === 'spell') return;
    const levelUp = comboMultiplier(next.streak) > comboMultiplier(state.streak);
    if (levelUp) sfx.playStreakMilestoneSound();
    else sfx.playTileSelectSound();
    pulseLive(levelUp ? 'big' : 'valid', reducedEffects);
  };

  return (
    <div data-testid="recall-quiz" className="flex w-full flex-col gap-2">
      <style>{RECALL_KEYFRAMES}</style>
      <RecallScoreBar mastered={mastered} total={total} score={tally.score} gained={tally.lastPoints} beat={answers} multiplier={multiplier} t={t} />

      {reviewing && last ? (
        <div
          data-testid="recall-feedback-wrong"
          role="status"
          className="flex flex-col gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-4 text-neo-black shadow-hard motion-safe:animate-[recall-shake_260ms_ease-in-out]"
        >
          <p className="inline-flex items-center gap-1.5 font-neo-display text-sm font-black uppercase text-neo-black/75">
            <Lightbulb className="size-4 fill-neo-yellow" aria-hidden="true" />
            {t('eduStudent.recall.wrongLead')}
          </p>
          <p dir="auto" className="break-words font-neo-display text-[clamp(1.5rem,8cqw,2.25rem)] font-black leading-tight">{last.word}</p>
          <p dir="auto" className="font-neo-body text-base leading-snug">{last.definition}</p>
          <p className="font-neo-body text-sm text-neo-black/70">{t('eduStudent.recall.wrongComeback')}</p>
          <button type="button" data-testid="recall-next" autoFocus onClick={() => setReviewing(false)} className={cn(BUTTON, PRESS, 'mt-1 bg-neo-cyan uppercase text-neo-black')}>
            {t('eduStudent.recall.next')}
            <DirectionalIcon icon={ArrowRight} className="size-5" />
          </button>
        </div>
      ) : (
        state.question && (
          <>
            <div
              key={qKey}
              className={cn(
                'relative flex min-h-28 flex-col justify-center gap-1.5 overflow-hidden rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 pb-5 pt-4 text-neo-black shadow-hard',
                last?.correct && 'ring-4 ring-neo-lime motion-safe:animate-[recall-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]'
              )}
            >
              <p className="font-neo-display text-sm font-black uppercase text-neo-black/70">
                {t(state.question.kind === 'spell' ? 'eduStudent.recall.spellQuestion' : 'eduStudent.recall.question')}
              </p>
              <p data-testid="recall-definition" dir="auto" className="font-neo-body text-lg font-bold leading-snug">{state.question.definition}</p>
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-1.5 bg-neo-black/10 motion-safe:block">
                <span
                  data-testid="recall-fuse"
                  className="block h-full origin-left bg-neo-cyan rtl:origin-right motion-safe:animate-[recall-fuse_var(--fuse)_linear_forwards]"
                  style={{ ['--fuse' as string]: `${bonusWindowMs(state.question.kind)}ms` }}
                />
              </span>
            </div>
            <span aria-live="polite" className="sr-only">
              {last?.correct ? t('eduStudent.recall.correct') : ''}
            </span>
            {last?.correct && (
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid="recall-correct" aria-hidden="true" className="inline-flex items-center gap-1 font-neo-display text-base font-black text-neo-lime edu-sky:text-edu-lime-ink">
                  <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                  {t('eduStudent.recall.correct')}
                </span>
                {state.streak >= 2 && (
                  <span
                    data-testid="recall-streak"
                    key={state.streak}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm motion-safe:animate-[recall-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]"
                  >
                    <Flame className="size-4" aria-hidden="true" />
                    {t('eduStudent.recall.streak', { count: state.streak })}
                  </span>
                )}
              </div>
            )}
            {state.question.kind === 'spell' ? (
              <RecallSpell
                key={`spell-${qKey}`}
                word={state.question.word}
                seed={state.queue.length + mastered * 7 + total}
                onDone={(clean) => pick(clean ? state.question!.word : '')}
              />
            ) : (
              <div data-testid="recall-options" className="grid grid-cols-2 gap-2.5">
                {state.question.options.map((word, i) => (
                  <button key={word} type="button" dir="auto" onClick={() => pick(word)} className={cn(RECALL_TILE, 'break-words', RECALL_FILLS[i % RECALL_FILLS.length])}>
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
