/**
 * The quiz finale's "practise these words", opened IN PLACE.
 *
 * It used to navigate to /student/lessons, which unmounted the multiplayer page
 * and took the student out of the live socket room: the teacher's one-tap
 * Rematch then started without them. This sheet sits over the finale instead,
 * so the phone never leaves the room, and `VocabQuizView` only renders it while
 * the quiz is `ended` — the rematch's first question closes it by itself.
 *
 * Dark-only overlay: hardcoded bg-neo-navy (Class 5), static appear.
 */

'use client';

import { BookOpen, X } from 'lucide-react';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import type { VocabQuizMissedWord } from './useVocabQuiz';

export interface VocabQuizMissedSheetProps {
  missed: VocabQuizMissedWord[];
  onClose: () => void;
  t: TranslateFn;
}

export function VocabQuizMissedSheet({ missed, onClose, t }: VocabQuizMissedSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vocab-quiz-missed-title"
      data-testid="vocab-quiz-missed-sheet"
      className="fixed inset-0 z-40 flex flex-col gap-4 bg-neo-navy px-4 pt-5 pb-6 text-neo-white"
    >
      <div className="shrink-0 flex items-center justify-between gap-3">
        <h2
          id="vocab-quiz-missed-title"
          className="flex items-center gap-2 font-neo-display font-bold text-2xl"
        >
          <BookOpen className="w-6 h-6 text-neo-cyan" aria-hidden />
          {t('vocabQuiz.practice.title')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('vocabQuiz.practice.close')}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated shadow-hard"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </div>

      <p
        role="status"
        className="shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-3 font-neo-body font-bold text-sm text-neo-black shadow-hard"
      >
        {t('vocabQuiz.practice.stillIn')}
      </p>

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {missed.map((m) => (
          <li
            key={m.index}
            className="rounded-neo border-[2px] border-neo-cyan bg-neo-navy-elevated p-4 shadow-hard"
          >
            <p className="font-neo-display font-bold text-xl leading-tight" dir="auto">
              {m.word}
            </p>
            {m.meaning && m.meaning !== m.word && (
              <p className="mt-1 font-neo-body text-base text-neo-white/85" dir="auto">
                {m.meaning}
              </p>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 w-full px-4 py-3.5 font-neo-display font-bold rounded-neo border-[3px] border-neo-black bg-neo-cyan text-neo-black shadow-hard"
      >
        {t('vocabQuiz.practice.close')}
      </button>
    </div>
  );
}

export default VocabQuizMissedSheet;
