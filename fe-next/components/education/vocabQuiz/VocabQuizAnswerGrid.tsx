/**
 * Live Vocab Quiz — the four answer buttons.
 *
 * Built for a phone held one-handed in a noisy classroom: two columns of dark
 * cards on one neutral edge, each badged in one of the four mode families, and a tap target
 * well above the 44px floor so a rushed twelve-year-old does not mis-tap. Colour is never
 * the only signal — every option also carries a shape glyph and, after the
 * reveal, an explicit check or cross, so a colour-blind student is not guessing.
 */

'use client';

import { m } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { choiceSetSizeClass } from './vocabQuizTextFit';
import { CelebrationBurst } from '../motion/CelebrationBurst';
import { EDU_MOTION, pressMotion, useReducedMotionSafe } from '../motion';

// One neutral edge at rest so the prompt leads; the family colour shows on the chip, on hover and on a pick, and only the answer earns the full fill.
const OPTION_STYLES = [
  { border: 'border-neo-lime', fill: 'bg-neo-lime', wash: 'bg-neo-lime/20', press: 'active:bg-neo-lime/20', hover: '[@media(hover:hover)]:hover:border-neo-lime [@media(hover:hover)]:hover:bg-neo-lime/10', glyph: '▲' },
  { border: 'border-neo-pink', fill: 'bg-neo-pink', wash: 'bg-neo-pink/20', press: 'active:bg-neo-pink/20', hover: '[@media(hover:hover)]:hover:border-neo-pink [@media(hover:hover)]:hover:bg-neo-pink/10', glyph: '●' },
  { border: 'border-neo-cyan', fill: 'bg-neo-cyan', wash: 'bg-neo-cyan/20', press: 'active:bg-neo-cyan/20', hover: '[@media(hover:hover)]:hover:border-neo-cyan [@media(hover:hover)]:hover:bg-neo-cyan/10', glyph: '■' },
  { border: 'border-neo-purple', fill: 'bg-neo-purple', wash: 'bg-neo-purple/20', press: 'active:bg-neo-purple/20', hover: '[@media(hover:hover)]:hover:border-neo-purple [@media(hover:hover)]:hover:bg-neo-purple/10', glyph: '◆' },
] as const;

// Inside the tile so it never needs gutter above the grid; vertically centred at the row's end on wider screens.
const CHIP =
  'absolute end-2.5 top-2.5 grid size-8 place-items-center rounded-full border-[3px] border-neo-black text-neo-black shadow-hard-sm sm:inset-y-0 sm:end-3 sm:my-auto sm:size-10';

type ChipKind = 'picked' | 'correct' | 'wrong';

export interface VocabQuizAnswerGridProps {
  choices: string[];
  /** The option this player picked, or null. */
  selectedIndex: number | null;
  /** Set once the reveal lands; null while the clock runs. */
  correctIndex: number | null;
  disabled: boolean;
  /** The clock ran out before the reveal: every tile but the pick dims while the answer is on its way. */
  frozen?: boolean;
  onSelect: (index: number) => void;
  t: TranslateFn;
  className?: string;
}

function ChoiceChip({ kind, reduced }: { kind: ChipKind; reduced: boolean }) {
  const Icon = kind === 'wrong' ? X : Check;
  return (
    <m.span
      key={kind}
      aria-hidden
      data-testid="vocab-quiz-choice-chip"
      data-chip={kind}
      initial={reduced ? false : { scale: 0.4, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={EDU_MOTION.spring.pop}
      className={cn(CHIP, kind === 'picked' ? 'bg-neo-cyan' : 'bg-neo-white')}
    >
      <Icon className="size-5" strokeWidth={3.5} />
    </m.span>
  );
}

export function VocabQuizAnswerGrid({
  choices,
  selectedIndex,
  correctIndex,
  disabled,
  frozen = false,
  onSelect,
  t,
  className,
}: VocabQuizAnswerGridProps) {
  const revealed = correctIndex !== null;
  const reduced = useReducedMotionSafe();
  const sizeClass = choiceSetSizeClass(choices);

  return (
    // On a phone the rows split whatever the prompt and footer leave, so the tiles fill the gap instead of floating.
    <div
      className={cn('grid grid-cols-2 gap-3 max-sm:flex-1 max-sm:auto-rows-fr sm:gap-x-4', className)}
      role="group"
      aria-label={t('vocabQuiz.answers.label')}
    >
      {choices.map((choice, index) => {
        const style = OPTION_STYLES[index % OPTION_STYLES.length];
        const isSelected = selectedIndex === index;
        const isCorrect = revealed && index === correctIndex;
        const isWrongPick = revealed && isSelected && index !== correctIndex;
        const faded = (revealed || frozen) && !isCorrect && !isSelected;
        const washed = isSelected && !isCorrect;
        const chip: ChipKind | null = isCorrect ? 'correct' : isWrongPick ? 'wrong' : isSelected && !revealed ? 'picked' : null;

        return (
          <m.button
            key={`${index}-${choice}`}
            type="button"
            {...(disabled ? {} : pressMotion(reduced))}
            disabled={disabled}
            onClick={() => onSelect(index)}
            aria-pressed={isSelected}
            data-picked={isSelected || undefined}
            aria-label={
              revealed
                ? t(isCorrect ? 'vocabQuiz.answers.correctOption' : 'vocabQuiz.answers.option', {
                    option: choice,
                  })
                : choice
            }
            data-dim={faded || undefined}
            className={cn(
              // Phone: chip over a bottom-start label, card-style. Wider: one button row, chip then label, a third shorter than a slab.
              'relative flex gap-3 rounded-neo border-[3px] font-neo-display font-black text-start break-words',
              'max-sm:min-h-[5.5rem] max-sm:flex-col max-sm:items-start max-sm:justify-between max-sm:p-3',
              'sm:min-h-[clamp(4rem,calc(32dvh_-_8rem),9rem)] xl:min-h-[clamp(4rem,calc(32dvh_-_8rem),11rem)] sm:items-center sm:justify-start sm:gap-4 sm:py-1 sm:ps-4',
              chip ? 'sm:pe-16' : 'sm:pe-4',
              // ! beats the unlayered global landscape button padding, which would push the lower row under the footer.
              '[@media(max-height:560px)]:min-h-12 [@media(max-height:560px)]:py-1!',
              'transition motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white focus-visible:ring-offset-2',
              // The answer is always green, whatever its family, so "right" reads the same on every tile.
              isCorrect
                ? 'border-neo-black bg-neo-lime text-neo-black'
                : faded
                  ? 'scale-[0.97] border-neo-white/25 bg-neo-navy text-neo-white/70'
                  : cn('bg-neo-navy-elevated text-neo-white', isWrongPick ? 'border-neo-red' : isSelected ? style.border : 'border-neo-white/20'),
              // A pick sits half pressed in, so it reads as held down until the reveal.
              isSelected && !revealed ? 'translate-y-[3px] shadow-[0_3px_0_0]' : 'shadow-[0_6px_0_0]',
              // One neutral lip for every resting tile; a black one vanishes on the navy.
              isCorrect || faded || isWrongPick ? 'shadow-neo-black' : 'shadow-neo-white/15',
              isSelected && cn('outline outline-4 outline-offset-2', isWrongPick ? 'outline-neo-red' : 'outline-neo-cyan'),
              !disabled && cn(style.hover, style.press, 'active:translate-y-[6px] active:shadow-none'),
              isWrongPick && 'animate-neo-shake motion-reduce:animate-none'
            )}
          >
            {washed && (
              <span
                aria-hidden
                data-testid="vocab-quiz-choice-wash"
                className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', isWrongPick ? 'bg-neo-red/20' : style.wash)}
              />
            )}
            {isCorrect && isSelected && (
              <span aria-hidden className="pointer-events-none absolute -inset-3">
                <CelebrationBurst playing burstKey={`${index}-${choice}`} variant="sparkle" />
              </span>
            )}
            <span
              aria-hidden
              data-testid="vocab-quiz-choice-badge"
              className={cn(
                'relative grid size-12 shrink-0 place-items-center rounded-xl border-[3px] border-neo-black text-xl leading-none text-neo-black shadow-hard-sm sm:size-14 sm:text-2xl xl:size-16 xl:text-3xl',
                '[@media(max-height:560px)]:size-8 [@media(max-height:560px)]:text-sm',
                style.fill
              )}
            >
              {style.glyph}
            </span>
            <span data-testid="vocab-quiz-choice-label" className={cn('relative min-w-0 max-w-full hyphens-auto', sizeClass, '[@media(max-height:560px)]:text-2xl')}>
              {choice}
            </span>
            {/* Keys only mean something with a keyboard; the verdict chip takes the slot once there is one. */}
            {!chip && (
              <kbd
                aria-hidden
                data-testid="vocab-quiz-key-hint"
                className="ms-auto hidden size-8 shrink-0 place-items-center rounded-md border-2 border-b-4 border-current font-neo-display text-sm font-black leading-none opacity-60 sm:[@media(pointer:fine)]:grid"
              >
                {index + 1}
              </kbd>
            )}
            {chip && <ChoiceChip kind={chip} reduced={reduced} />}
          </m.button>
        );
      })}
    </div>
  );
}

export default VocabQuizAnswerGrid;
