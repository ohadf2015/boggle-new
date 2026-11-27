import { cn } from '@/lib/utils';

/** One in-game action bar for every mode: square chunky icon buttons flanking one compact chunky primary. */
export const ACTION_BAR = 'flex items-center justify-center gap-3 tv:gap-5';

const LIP = 'border-3 border-neo-black shadow-[0_4px_0_rgb(var(--neo-black))] active:translate-y-1 active:shadow-none disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_rgb(var(--neo-black))] disabled:cursor-default';

export const ACTION_ROUND = cn('grid size-12 shrink-0 place-items-center rounded-neo bg-neo-navy-light text-neo-cream tv:size-20', LIP);

export function actionPrimary(ready: boolean): string {
  return cn(
    'h-12 rounded-neo px-8 font-neo-display text-lg font-black uppercase tracking-wide tv:h-20 tv:px-12 tv:text-3xl',
    LIP,
    ready ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream',
  );
}
