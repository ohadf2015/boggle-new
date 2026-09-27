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

/**
 * One family per option, in the fixed order students learn to expect.
 *
 * Black text on all four, including pink and purple where white is the obvious
 * choice and the failing one: #ff1493 is 3.64:1 against white and #8b5cf6 is
 * 4.24:1, both under the 4.5:1 AA floor these tiles have to clear as the only
 * controls on the screen. Black clears it on every fill (5.8:1 and 5.0:1), and
 * one rule for four tiles is also the more legible design.
 *
 * `dim` is the post-reveal state for an option nobody needs to read closely any
 * more. It is a genuinely different FILL rather than transparency laid over the
 * bright one: the muted token still contrasts hard against the navy, so the
 * tile keeps its edge instead of dissolving into the surface.
 *
 * Ink is per fill, not per family, because purple is the one place the two
 * disagree: #8b5cf6 takes black at 4.96:1, but its muted twin #7c4fcc drops
 * black to 3.85:1 and lifts white to 5.46:1. Every ratio here was measured
 * against the live page, not eyeballed.
 */
const OPTION_STYLES = [
  { base: 'bg-neo-lime', dim: 'bg-neo-lime-muted', text: 'text-neo-black', dimText: 'text-neo-black', glyph: '▲' },
  { base: 'bg-neo-pink', dim: 'bg-neo-pink-muted', text: 'text-neo-black', dimText: 'text-neo-black', glyph: '●' },
  { base: 'bg-neo-cyan', dim: 'bg-neo-cyan-muted', text: 'text-neo-black', dimText: 'text-neo-black', glyph: '■' },
  { base: 'bg-neo-purple', dim: 'bg-neo-purple-muted', text: 'text-neo-black', dimText: 'text-neo-white', glyph: '◆' },
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
  /** Lets the caller hand the grid the height it is allowed to fill. */
  className?: string;
}

export function VocabQuizAnswerGrid({
  choices,
  selectedIndex,
  correctIndex,
  disabled,
  onSelect,
  t,
  className,
}: VocabQuizAnswerGridProps) {
  const revealed = correctIndex !== null;

  return (
    // Two columns from the narrowest phone up: a 2x2 block sits in the bottom
    // half of a 390x844 screen where a thumb actually reaches, and the four
    // tiles split the height they are given rather than stacking past the fold.
    <div
      className={cn('grid grid-cols-2 auto-rows-fr gap-2.5 sm:gap-3', className)}
      role="group"
      aria-label={t('vocabQuiz.answers.label')}
    >
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
              'relative h-full min-h-[64px] px-3 py-3 sm:px-4 sm:py-4 rounded-neo border-[2px] border-neo-black',
              'font-neo-display font-bold text-base sm:text-lg text-start break-words',
              'flex items-center gap-2 sm:gap-3 transition-all',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white focus-visible:ring-offset-2',
              faded ? cn(style.dim, style.dimText) : cn(style.base, style.text),
              isSelected ? 'shadow-hard-lg ring-4 ring-neo-white' : 'shadow-hard',
              // The press lives on `:active` and NOWHERE else. `animate-neo-press`
              // is `…forwards` onto a 100% keyframe of translate(1px,1px) +
              // --shadow-pressed, so applying it unconditionally left all four
              // tiles resting in the pressed state with the hard shadow gone.
              !disabled && 'active:translate-y-[2px] active:shadow-hard-sm',
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
