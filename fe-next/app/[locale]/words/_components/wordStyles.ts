import { cn } from '@/lib/utils';
import { neoChunkyPress } from '@/components/ui/neoStyles';

// Each link carries `data-press` so the page's PressGroup can sink it.
export const PRIMARY_CTA = cn(
  'inline-flex min-h-14 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime px-8 font-neo-display text-xl font-black text-neo-black sm:w-auto',
  neoChunkyPress(4),
  'shadow-neo-lime-dark',
);

export const SECONDARY_CTA = cn(
  'inline-flex min-h-12 items-center justify-center rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-5 font-bold text-neo-cream',
  neoChunkyPress(2),
  'shadow-neo-cream/25',
);

export const CHIP = cn(
  'rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-cream hover:border-neo-cyan',
  neoChunkyPress(2),
  'shadow-neo-cream/20',
);

export const SECTION_LABEL = 'text-sm font-bold uppercase tracking-wider text-neo-cyan';
