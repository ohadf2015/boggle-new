/**
 * Live Vocab Quiz — the four answer buttons.
 *
 * Built for a phone held one-handed in a noisy classroom: two columns, each
 * button its own colour from the four mode families, and a tap target far above
 * the 44px floor so a rushed twelve-year-old does not mis-tap. Colour is never
 * the only signal — every option also carries a shape glyph and, after the
 * reveal, an explicit check or cross, so a colour-blind student is not guessing.
 */

'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';

/** One family per option, in the fixed order students learn to expect. */
const OPTION_STYLES = [
  { base: 'bg-neo-lime text-neo-black', dim: 'bg-neo-lime-muted', glyph: '▲' },
  { base: 'bg-neo-pink text-neo-white', dim: 'bg-neo-pink-muted', glyph: '●' },
  { base: 'bg-neo-cyan text-neo-black', dim: 'bg-neo-cyan-muted', glyph: '■' },
  { base: 'bg-neo-purple text-neo-white', dim: 'bg-neo-purple-muted', glyph: '◆' },
] as const;

export interface VocabQuizAnswerGridProps {
  choices: string[];
  /** The option this player picked, or null. */
  selectedIndex: number | null;
  /** Set once the reveal lands; null while the clock runs. */
  correctIndex: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
  t: TranslateFn;
}

export function VocabQuizAnswerGrid({
  choices,
  selectedIndex,
  correctIndex,
  disabled,
  onSelect,
  t,
}: VocabQuizAnswerGridProps) {
  const revealed = correctIndex !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label={t('vocabQuiz.answers.label')}>
      {choices.map((choice, index) => {
        const style = OPTION_STYLES[index % OPTION_STYLES.length];
        const isSelected = selectedIndex === index;
        const isCorrect = revealed && index === correctIndex;
        const isWrongPick = revealed && isSelected && index !== correctIndex;
        // Before the reveal every option keeps its colour. After it, anything
        // that is neither the answer nor this player's pick fades back so the
        // two that matter read instantly from across a room.
        const faded = revealed && !isCorrect && !isSelected;

        return (
          <button
            key={`${index}-${choice}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(index)}
            aria-pressed={isSelected}
            aria-label={
              revealed
                ? t(isCorrect ? 'vocabQuiz.answers.correctOption' : 'vocabQuiz.answers.option', {
                    option: choice,
                  })
                : choice
            }
            className={cn(
              'relative min-h-[64px] px-4 py-4 rounded-neo border-neo border-neo-black',
              'font-neo-display font-bold text-lg text-start break-words',
              'flex items-center gap-3 transition-all',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white focus-visible:ring-offset-2',
              faded ? cn(style.dim, 'text-neo-white/70 opacity-60') : style.base,
              isSelected ? 'shadow-hard-lg ring-4 ring-neo-white' : 'shadow-hard',
              !disabled && 'active:translate-y-[2px] active:shadow-hard-sm animate-neo-press',
              disabled && !revealed && 'opacity-90',
              isWrongPick && 'animate-neo-shake'
            )}
          >
            <span aria-hidden className="shrink-0 text-xl leading-none opacity-80">
              {style.glyph}
            </span>
            <span className="flex-1">{choice}</span>
            {isCorrect && <Check className="w-6 h-6 shrink-0" aria-hidden />}
            {isWrongPick && <X className="w-6 h-6 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export default VocabQuizAnswerGrid;
