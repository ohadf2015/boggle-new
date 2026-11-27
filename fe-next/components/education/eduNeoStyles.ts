/**
 * Classroom twins of the dark pieces in components/ui/neoStyles, on edu-* tokens so
 * they turn sky under data-edu-theme="sky" while the main game keeps the originals.
 * Each one equals the sky codemod applied to its neo source (eduNeoStyles.test.ts).
 */
import { NEO_BLOCK_TONES, NEO_BUTTON, NEO_QUIET_PRESS, NEO_TRANSLATE_PRESS, neoPress } from '@/components/ui/neoStyles';

export const EDU_FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface';
export const EDU_QUIET_FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface';

export const EDU_DARK_EDGE = 'border-edu-line';

export const EDU_BLOCK_TONES = {
  ...NEO_BLOCK_TONES,
  pink: 'bg-neo-pink text-edu-ink border-neo-black',
  purple: 'bg-neo-purple text-neo-black border-neo-black',
  navy: `bg-edu-surface text-edu-ink ${EDU_DARK_EDGE}`,
} as const;

const CHUNKY_BASE = [
  'inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl',
  NEO_TRANSLATE_PRESS,
  EDU_FOCUS,
].join(' ');

export const EDU_BUTTON = {
  primary: `${CHUNKY_BASE} min-h-[56px] px-5 text-xl bg-neo-lime text-neo-black`,
  secondary: `${CHUNKY_BASE} min-h-[48px] px-4 text-base bg-edu-surface text-edu-ink ${EDU_DARK_EDGE}`,
  small: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black shadow-hard-lg',
    NEO_TRANSLATE_PRESS,
    EDU_FOCUS,
  ].join(' '),
  livePrimary: NEO_BUTTON.livePrimary,
  liveSecondary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-edu-line bg-edu-surface px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-edu-ink hover:bg-edu-surface ${neoPress(2)}`,
  outlineLarge: [
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-neo px-5',
    'border-2 border-edu-line bg-transparent font-neo-display text-base font-bold text-edu-ink',
    'hover:border-edu-line hover:bg-edu-ink/10',
    NEO_QUIET_PRESS,
    EDU_QUIET_FOCUS,
  ].join(' '),
  outline: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-edu-line px-3',
    'font-neo-display text-sm font-bold text-edu-ink hover:border-edu-line hover:bg-edu-ink/10',
    NEO_QUIET_PRESS,
    EDU_QUIET_FOCUS,
  ].join(' '),
  ghost: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-transparent bg-transparent px-3',
    'font-neo-display text-sm font-bold text-edu-ink hover:border-edu-line hover:bg-edu-ink/10',
    NEO_QUIET_PRESS,
    EDU_QUIET_FOCUS,
  ].join(' '),
} as const;
