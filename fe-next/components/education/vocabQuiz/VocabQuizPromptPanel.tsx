/**
 * Live Vocab Quiz: the prompt, the one focal task on the screen.
 *
 * Lexi on the start side, the topic label and the ask beside her, and the
 * target word under them, unframed on the navy so the word alone leads.
 */

'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';
import { promptSizeClass } from './vocabQuizTextFit';

export interface VocabQuizPromptPanelProps {
  focusLabel: string;
  ask: string;
  prompt: string;
  mascot: ExtendedMascotVariant;
  /** At the reveal, wide screens show Lexi on the verdict sheet, so the panel drops her rather than framing an empty hole. */
  revealed: boolean;
  /** The countdown, pinned to the card's end corner so the question and its clock read as one thing. */
  timer?: ReactNode;
  t: TranslateFn;
}

// A tall phone stacks Lexi over the word; the answers below take the rest of the height.
export function VocabQuizPromptPanel({ focusLabel, ask, prompt, mascot, revealed, timer, t }: VocabQuizPromptPanelProps) {
  return (
    <div
      data-testid="vocab-quiz-question-block"
      className="relative flex items-center gap-3 sm:gap-5 [@media(max-width:639px)_and_(min-height:800px)]:flex-col [@media(max-width:639px)_and_(min-height:800px)]:gap-2"
    >
      <span data-testid="vocab-quiz-question-mascot" className={cn('shrink-0 self-center [@media(max-height:560px)]:hidden', revealed && 'sm:hidden')}>
        <InteractiveMascot
          variant={mascot}
          sizeClassName="size-16 sm:size-24 [@media(max-width:639px)_and_(min-height:800px)]:size-20"
          clipShape="circle"
          clipBorder="purple"
          clipBg="var(--neo-navy)"
          animated
          // A reaction, not a control: a tappable face inches from the answers is a mis-tap on a phone.
          enableHover={false}
          enableClick={false}
          alt={t('vocabQuiz.mascot.alt')}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 [@media(max-width:639px)_and_(min-height:800px)]:w-full [@media(max-width:639px)_and_(min-height:800px)]:flex-none [@media(max-width:639px)_and_(min-height:800px)]:items-center [@media(max-width:639px)_and_(min-height:800px)]:text-center">
        <p
          data-testid="vocab-quiz-focus"
          className="flex items-center gap-1.5 [@media(max-height:560px)]:hidden font-neo-display text-xs font-black uppercase tracking-wider text-neo-purple sm:text-sm [@media(max-width:639px)_and_(min-height:800px)]:text-sm"
        >
          <Sparkles className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="min-w-0 break-words">{focusLabel}</span>
        </p>
        <p data-testid="vocab-quiz-ask" className="font-neo-display text-xl font-bold leading-tight text-neo-cream sm:text-2xl [@media(max-height:560px)]:text-lg">
          {ask}
        </p>
        <p
          data-testid="vocab-quiz-prompt"
          className={cn('mt-1 font-neo-display font-black break-words text-start text-neo-white [@media(max-width:639px)_and_(min-height:800px)]:text-center', promptSizeClass(prompt), '[@media(max-height:560px)]:text-[2.5rem] [@media(max-height:560px)]:mt-0')}
        >
          {prompt}
        </p>
      </div>
      {timer && <span className="shrink-0 self-start [@media(max-width:639px)_and_(min-height:800px)]:absolute [@media(max-width:639px)_and_(min-height:800px)]:end-3 [@media(max-width:639px)_and_(min-height:800px)]:top-3">{timer}</span>}
    </div>
  );
}

export default VocabQuizPromptPanel;
