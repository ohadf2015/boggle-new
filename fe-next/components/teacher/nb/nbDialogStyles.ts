import { NB_BLOCK, NB_DARK_EDGE, NB_SMALL, type NbColor } from './nbStyles';

/**
 * One chrome for every dialog, sheet and menu a teacher opens.
 * The app-wide dialog primitive is light-first and `dark:`-styled (slate edge, halftone, red close),
 * so every override here also names its `dark:` and `sm:`/`lg:`/`xl:` twin, or the primitive's variant wins.
 */

const SURFACE = [
  'flex flex-col gap-0 p-0 overflow-hidden',
  'bg-neo-navy dark:bg-neo-navy text-neo-cream dark:text-neo-cream',
  `border-[3px] sm:border-[3px] ${NB_DARK_EDGE} dark:border-neo-cream/50`,
  // tailwind-merge does not group the custom rounded-neo* scale, so the primitive's radius would stay; `!` settles it.
  'rounded-neo-xl! sm:rounded-neo-xl! shadow-hard-xl sm:shadow-hard-xl',
].join(' ');

export const NB_DIALOG_SIZE = {
  sm: 'sm:max-w-md lg:max-w-md xl:max-w-md',
  md: 'sm:max-w-lg lg:max-w-lg xl:max-w-lg',
  lg: 'sm:max-w-2xl lg:max-w-2xl xl:max-w-2xl',
  xl: 'sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl',
} as const;
export type NbDialogSize = keyof typeof NB_DIALOG_SIZE;

const NO_PHONE_TWEEN = 'max-sm:data-[state=open]:animate-none max-sm:data-[state=closed]:animate-none';

/** Phone presentation: a short dialog docks to the bottom edge; a long editor takes the whole screen. */
export const NB_DIALOG_PHONE = {
  sheet: `max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none! max-sm:border-b-0 max-sm:shadow-none max-sm:max-h-[92dvh] ${NO_PHONE_TWEEN}`,
  full: `max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none! max-sm:border-0 max-sm:shadow-none max-sm:pt-[env(safe-area-inset-top)] ${NO_PHONE_TWEEN}`,
} as const;
export type NbDialogPhone = keyof typeof NB_DIALOG_PHONE;

/** Classes for the primitive's DialogContent (pair with style={{ backgroundImage: 'none' }} and hideCloseButton). */
export function nbDialogContentClass(size: NbDialogSize = 'md', phone: NbDialogPhone = 'sheet'): string {
  return `${SURFACE} w-[calc(100%-2rem)] max-h-[min(90dvh,56rem)] sm:max-h-[min(90dvh,56rem)] ${NB_DIALOG_SIZE[size]} ${NB_DIALOG_PHONE[phone]}`;
}

/** Hand-rolled overlays (no Radix): a static backdrop layer that docks its panel to the bottom on phones. */
export const NB_OVERLAY_LAYER = 'fixed inset-0 z-[90] flex items-end justify-center bg-neo-black/85 sm:items-center sm:p-4';

/** Hand-rolled panel inside NB_OVERLAY_LAYER: bottom sheet on phones, chunky centered card from sm up. */
export const NB_OVERLAY_PANEL = [
  'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-neo-navy text-neo-cream text-start',
  `border-[3px] border-b-0 ${NB_DARK_EDGE} rounded-t-neo-xl`,
  'sm:max-h-[90dvh] sm:border-b-[3px] sm:rounded-neo-xl sm:shadow-hard-xl',
].join(' ');

const HEADER_BASE = 'relative flex shrink-0 items-start gap-3 border-b-[3px] px-4 py-3 sm:px-5 sm:py-4';

/** Header strip: a flat color block (black rule) or navy (cream rule). */
export function nbDialogHeaderClass(color: NbColor = 'navy'): string {
  return `${HEADER_BASE} ${NB_BLOCK[color]}`;
}

/** Title on the strip; counters the primitive title's uppercase/tracking/size ramp. */
export const NB_DIALOG_TITLE =
  'font-neo-display text-2xl sm:text-2xl lg:text-2xl font-black normal-case tracking-normal leading-tight text-balance text-current';

export const NB_DIALOG_DESCRIPTION = 'mt-1 font-neo-body text-sm font-bold leading-snug text-current opacity-85';

/** Square chunky close, 44px, cream on any strip. */
export const NB_DIALOG_CLOSE = `${NB_SMALL} ${NB_BLOCK.cream} size-11 shrink-0 cursor-pointer px-0`;

export const NB_DIALOG_BODY = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5';

/** Footer: DOM order [secondary…, primary] → phone stacks primary on top, desktop puts it at the end. */
export const NB_DIALOG_FOOTER = [
  'flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3',
  `border-t-[3px] ${NB_DARK_EDGE} bg-neo-navy-light px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5`,
].join(' ');

/** Dropdown menu panel and its rows. */
export const NB_MENU = `rounded-neo-lg border-[3px] ${NB_DARK_EDGE} bg-neo-navy-light p-1.5 text-neo-cream shadow-hard-lg`;
export const NB_MENU_ITEM =
  'min-h-11 gap-3 rounded-neo px-2.5 font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-navy focus:bg-neo-navy';
