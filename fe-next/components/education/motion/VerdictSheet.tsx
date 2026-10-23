'use client';

import { Check, Flame, X } from 'lucide-react';
import { FeedbackSheet, type FeedbackVariant } from './FeedbackSheet';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface VerdictSheetProps {
  /** Null when the student never answered in time. */
  correct: boolean | null;
  answer: string;
  points?: number | null;
  streak?: number;
  t: Translate;
  /** Sound hook, fired in the frame the sheet mounts. */
  onShow?: (variant: FeedbackVariant) => void;
}

export function VerdictSheet({ correct, answer, points, streak = 0, t, onShow }: VerdictSheetProps) {
  const variant: FeedbackVariant = correct ? 'correct' : 'incorrect';
  const title = correct
    ? t('vocabQuiz.correctShort')
    : correct === false
      ? t('vocabQuiz.feedback.wrong', { answer })
      : t('vocabQuiz.feedback.noAnswer', { answer });
  const Icon = correct ? Check : X;

  return (
    <FeedbackSheet
      open
      variant={variant}
      title={title}
      onShow={onShow}
      icon={
        <span className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-neo-black bg-neo-white text-neo-black">
          <Icon className="size-6" strokeWidth={3.5} aria-hidden />
        </span>
      }
      action={
        correct && typeof points === 'number' && points > 0 ? (
          <span className="rounded-neo border-[3px] border-neo-black bg-neo-white px-2 py-0.5 font-neo-display text-2xl font-black tabular-nums text-neo-black">
            +{points}
          </span>
        ) : undefined
      }
    >
      {correct && streak >= 2 ? (
        <span className="flex items-center gap-1 uppercase tracking-wide">
          <Flame className="size-4 shrink-0" aria-hidden />
          {t('eg2Modes.feedback.streak', { count: streak })}
        </span>
      ) : null}
    </FeedbackSheet>
  );
}
