import { cn } from '@/lib/utils';

export const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';

// Shadow-only press feedback: a translate moves the hit target, so the first tap could land off-button.
export const SOLVE_BUTTON = cn(
  'min-h-14 flex-1 rounded-neo-lg border-3 border-neo-black px-7 py-3 font-neo-display text-lg font-bold',
  'bg-neo-lime text-neo-black shadow-hard-xl transition-shadow duration-100',
  'enabled:hover:shadow-hard-pressed enabled:active:shadow-hard-pressed',
  'disabled:cursor-not-allowed disabled:border-dashed disabled:border-neo-black/50 disabled:bg-neo-navy/10 disabled:text-neo-black/65 disabled:shadow-none',
);

export const CLEAR_BUTTON =
  'min-h-14 rounded-neo-lg border-3 border-neo-black bg-neo-white px-5 py-3 font-neo-display font-bold text-neo-black shadow-hard-sm transition-shadow duration-100 hover:shadow-hard-pressed';

export const TEXT_INPUT = cn(
  'min-h-14 w-full min-w-0 px-4 py-3 font-mono text-xl font-bold tracking-widest',
  'rounded-neo-lg border-3 border-neo-black bg-neo-white text-neo-black',
  'focus:outline-hidden focus:ring-3 focus:ring-neo-cyan',
  'placeholder:font-normal placeholder:tracking-normal placeholder:text-neo-black/45',
);

export const ERROR_BOX = 'rounded-neo-lg border-3 border-neo-black bg-neo-pink p-4 font-bold text-neo-black';

export const WORD_CHIP = 'rounded-neo border-2 border-neo-black bg-neo-white px-3 py-1.5 font-mono text-sm font-bold text-neo-black';
