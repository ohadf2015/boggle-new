// One button and card vocabulary for Teacher Home, class setup and their states.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';
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
  'border-2 border-neo-cream/60 bg-transparent font-neo-display text-base font-bold text-neo-cream',
  'hover:border-neo-cream hover:bg-neo-cream/10',
  PRESS,
  FOCUS,
].join(' ');

export const QUIET_LINK = [
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo px-2 font-neo-body text-sm font-bold text-neo-cream/80',
  'underline decoration-1 underline-offset-4 hover:text-neo-cream',
  PRESS,
  FOCUS,
].join(' ');

export const PANEL = 'rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light shadow-hard';

export const OUTLINE_BUTTON = [
  'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-cream/40 px-3',
  'font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream hover:bg-neo-cream/10',
  PRESS,
  FOCUS,
].join(' ');

export const CHIP = 'inline-flex items-center whitespace-nowrap rounded-neo border border-neo-cream/25 px-1.5 py-px font-neo-body text-xs font-bold text-neo-cream/80';

export const SKELETON = 'animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none';
