// One button and card vocabulary for Teacher Home, class setup and their states.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';
const PRESS =
  'transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60';

export const PRIMARY_BUTTON = [
  'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-neo px-6',
  'border-[3px] border-neo-black bg-neo-lime font-neo-display text-lg font-black text-neo-black shadow-hard',
  'hover:-translate-y-0.5 hover:shadow-hard-lg',
  PRESS,
  FOCUS,
].join(' ');

export const SECONDARY_BUTTON = [
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-neo px-5',
  'border-[3px] border-neo-black bg-neo-cream font-neo-display text-base font-bold text-neo-black shadow-hard-sm',
  'hover:-translate-y-0.5 hover:shadow-hard',
  PRESS,
  FOCUS,
].join(' ');

export const QUIET_LINK = [
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo px-2 font-neo-body text-sm font-bold text-neo-cream/80',
  'underline decoration-1 underline-offset-4 hover:text-neo-cream',
  PRESS,
  FOCUS,
].join(' ');

/** A raised navy panel: the cream edge keeps it visible on the navy page (>= 3:1). */
export const PANEL = 'rounded-neo-lg border-[3px] border-neo-cream/80 bg-neo-navy-light shadow-hard';

export const SKELETON = 'animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none';
