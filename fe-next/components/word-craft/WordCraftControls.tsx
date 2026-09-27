'use client';

import { memo } from 'react';
import { Check, Undo2, SkipForward, Repeat, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WordCraftControlsProps {
  canSubmit: boolean;
  canRecall: boolean;
  canSwap: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onRecall: () => void;
  onPass: () => void;
  onSwap: () => void;
  /** Optional clue affordance. Omitted in hot-seat (no bot, no clues). */
  onClue?: () => void;
  /** Remaining free clues; 0 means the next tap offers a rewarded ad. */
  cluesRemaining?: number;
  labels: {
    submit: string;
    recall: string;
    pass: string;
    swap: string;
    clue?: string;
  };
}

/**
 * Icon-driven control row.
 *
 * - Submit is the hero: large, lime, lifted shadow, breathing glow when ready.
 *   The check icon alone communicates the action — no copy needed.
 * - Secondary actions (recall, pass, swap) are square icon buttons. Labels
 *   live in `aria-label` and `title` (tooltip on hover) so we stay
 *   internationalisation-clean without spending pixels on translated words.
 */
function WordCraftControlsImpl({
  canSubmit,
  canRecall,
  canSwap,
  disabled,
  onSubmit,
  onRecall,
  onPass,
  onSwap,
  onClue,
  cluesRemaining,
  labels,
}: WordCraftControlsProps) {
  const submitLive = canSubmit && !disabled;
  return (
    <div data-wc-controls className="flex gap-2 justify-center items-stretch shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        aria-label={labels.submit}
        title={labels.submit}
        className={cn(
          'flex-1 h-12 sm:h-14 rounded-neo border-neo-thick border-black',
          'bg-neo-lime text-neo-navy font-neo-display font-black',
          'shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
          'flex items-center justify-center gap-2 transition-transform',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-hard-pressed',
          submitLive && 'wc-submit-pulse hover:-translate-y-0.5',
        )}
      >
        <Check className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={3.5} />
      </button>

      <IconBtn
        onClick={onRecall}
        disabled={disabled || !canRecall}
        label={labels.recall}
        tone="cyan"
      >
        <Undo2 className="w-5 h-5" strokeWidth={3} />
      </IconBtn>
      <IconBtn
        onClick={onPass}
        disabled={disabled}
        label={labels.pass}
        tone="purple"
      >
        <SkipForward className="w-5 h-5" strokeWidth={3} />
      </IconBtn>
      <IconBtn
        onClick={onSwap}
        disabled={disabled || !canSwap}
        label={labels.swap}
        tone="pink"
      >
        <Repeat className="w-5 h-5" strokeWidth={3} />
      </IconBtn>
      {onClue ? (
        <button
          type="button"
          onClick={onClue}
          // Stays enabled at 0 clues so the tap can offer a rewarded ad.
          disabled={disabled}
          aria-label={labels.clue}
          title={labels.clue}
          className={cn(
            'relative w-12 h-12 sm:w-14 sm:h-14 rounded-neo border-neo-thick border-black',
            'bg-neo-cream text-neo-navy shadow-hard',
            'flex items-center justify-center transition-all',
            'active:translate-y-0.5 active:shadow-hard-pressed hover:bg-neo-cyan hover:text-neo-navy',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-hard-pressed',
          )}
        >
          <Lightbulb className="w-5 h-5" strokeWidth={3} />
          <span
            aria-hidden
            className={cn(
              'absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full',
              'flex items-center justify-center text-[11px] font-neo-display font-black',
              'border-2 border-black',
              (cluesRemaining ?? 0) > 0 ? 'bg-neo-lime text-neo-navy' : 'bg-neo-pink text-white',
            )}
          >
            {(cluesRemaining ?? 0) > 0 ? cluesRemaining : '+'}
          </span>
        </button>
      ) : null}
    </div>
  );
}

interface IconBtnProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  tone: 'cyan' | 'purple' | 'pink';
  children: React.ReactNode;
}

const TONE: Record<IconBtnProps['tone'], string> = {
  cyan: 'hover:bg-neo-cyan hover:text-neo-navy',
  purple: 'hover:bg-neo-purple hover:text-white',
  pink: 'hover:bg-neo-pink hover:text-white',
};

function IconBtn({ onClick, disabled, label, tone, children }: IconBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'w-12 h-12 sm:w-14 sm:h-14 rounded-neo border-neo-thick border-black',
        'bg-neo-cream text-neo-navy shadow-hard',
        'flex items-center justify-center transition-all',
        'active:translate-y-0.5 active:shadow-hard-pressed',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-hard-pressed',
        TONE[tone],
      )}
    >
      {children}
    </button>
  );
}

export const WordCraftControls = memo(WordCraftControlsImpl);
