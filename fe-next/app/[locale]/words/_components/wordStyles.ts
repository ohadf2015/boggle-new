import { cn } from '@/lib/utils';
import { neoChunkyPress } from '@/components/ui/neoStyles';

// Each link carries `data-press` so the page's PressGroup can sink it.
export const PRIMARY_CTA = cn(
  'inline-flex min-h-14 w-full items-center justify-center rounded-neo-lg border-3 border-neo-black bg-neo-lime px-8 font-neo-display text-lg font-bold text-neo-black sm:w-auto',
  neoChunkyPress(4),
);

export const SECONDARY_CTA = cn(
  'inline-flex min-h-12 items-center justify-center rounded-neo-lg border-3 border-neo-black bg-neo-cream px-5 font-bold text-neo-black',
  neoChunkyPress(2),
);

export const CHIP = cn(
  'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black hover:bg-neo-yellow',
  neoChunkyPress(2),
);

export const SECTION_LABEL = 'font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl';

export const PAPER_CARD = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
