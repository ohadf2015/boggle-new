'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { maskAnswer } from '@/lib/practice/riddleMask';
import type { PracticeRiddle } from '@/lib/practice/practicePuzzle';

interface Props {
  riddle: PracticeRiddle | null;
  /** Number of leading letters to reveal as a hint (FTUE). */
  revealedCount?: number;
  /** When solved, the whole word shows + a celebratory label. */
  solved?: boolean;
  className?: string;
}

/**
 * The headline practice objective: a real riddle (lexicon clue) whose answer is
 * GUARANTEED embedded on the board. Shows the clue + a masked answer that the
 * helper can progressively reveal. Solving it = the celebrated win.
 *
 * Renders nothing when the language has no riddle pool (sv/ja/es) — the board
 * still plays, just without the riddle layer.
 */
export default function PracticeRiddleCard({
  riddle,
  revealedCount = 0,
  solved = false,
  className,
}: Props) {
  const { t } = useLanguage();
  if (!riddle) return null;

  const reveal = solved ? riddle.word.length : revealedCount;
  const tokens = maskAnswer(riddle.word, reveal);

  return (
    <div
      data-testid="practice-riddle"
      role="group"
      aria-label={t('practice.riddle.label')}
      className={
        className ??
        `mx-auto w-full max-w-md flex flex-col items-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm transition-colors ${
          solved ? 'bg-neo-lime' : 'bg-neo-cyan/15'
        }`
      }
    >
      <div className="flex items-center gap-2 w-full">
        <span className="font-neo-display font-black text-[0.65rem] uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded-full bg-neo-black text-neo-cyan">
          {solved ? t('practice.riddle.solved') : t('practice.riddle.label')}
        </span>
        <span className="font-neo-body text-sm leading-snug flex-1 text-neo-white">
          {riddle.clue}
        </span>
      </div>
      <div
        data-testid="practice-riddle-answer"
        dir="auto"
        className="flex items-center gap-1.5"
        aria-label={solved ? riddle.word : t('practice.riddle.answerHint')}
      >
        {tokens.map((ch, i) => (
          <span
            key={i}
            className={`inline-flex items-center justify-center w-6 h-7 rounded border-2 border-neo-black font-neo-display font-black text-base ${
              ch === '•'
                ? 'bg-neo-navy text-neo-white/40'
                : 'bg-neo-cream text-neo-black'
            }`}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
