import type { MpDesktopMode } from '@/components/multiplayer/desktop/types';

export type MpThemeColor = 'cyan' | 'pink' | 'purple' | 'lime';
export type MpThemeMascot = 'focused' | 'excited' | 'curious' | 'wild';
export type MpThemeTexture = 'halftone-dots' | 'radial-burst' | 'dotted-target' | 'confetti-scatter';

export interface MpDesktopTheme {
  mode: MpDesktopMode;
  color: MpThemeColor;
  mascot: MpThemeMascot;
  texture: MpThemeTexture;
  headerLabel: string;
  borderClass: string;
  bgTintClass: string;
  textClass: string;
  shadowClass: string;
  ringClass: string;
  textureClass: string;
}

const COLOR_TOKEN: Record<MpThemeColor, Omit<MpDesktopTheme, 'mode' | 'mascot' | 'texture' | 'headerLabel'>> = {
  cyan: {
    color: 'cyan',
    borderClass: 'border-neo-cyan',
    bgTintClass: 'bg-neo-cyan/5',
    textClass: 'text-neo-cyan',
    shadowClass: 'shadow-hard-cyan',
    ringClass: 'ring-neo-cyan',
    textureClass: 'texture-halftone-comic-light',
  },
  pink: {
    color: 'pink',
    borderClass: 'border-neo-pink',
    bgTintClass: 'bg-neo-pink/5',
    textClass: 'text-neo-pink',
    shadowClass: 'shadow-hard-pink',
    ringClass: 'ring-neo-pink',
    textureClass: 'texture-halftone-comic',
  },
  purple: {
    color: 'purple',
    borderClass: 'border-neo-purple',
    bgTintClass: 'bg-neo-purple/5',
    textClass: 'text-neo-purple',
    shadowClass: 'shadow-hard-purple',
    ringClass: 'ring-neo-purple',
    textureClass: 'texture-halftone-comic-light',
  },
  lime: {
    color: 'lime',
    borderClass: 'border-neo-lime',
    bgTintClass: 'bg-neo-lime/5',
    textClass: 'text-neo-lime',
    shadowClass: 'shadow-hard-lime',
    ringClass: 'ring-neo-lime',
    textureClass: 'texture-halftone-comic-dense',
  },
};

export const MP_DESKTOP_THEMES: Record<MpDesktopMode, MpDesktopTheme> = {
  classic: {
    mode: 'classic',
    mascot: 'focused',
    texture: 'halftone-dots',
    headerLabel: 'STANDARD',
    ...COLOR_TOKEN.cyan,
  },
  'wheel-rush': {
    mode: 'wheel-rush',
    mascot: 'excited',
    texture: 'radial-burst',
    headerLabel: 'WHEEL RUSH',
    ...COLOR_TOKEN.pink,
  },
  'word-hunt': {
    mode: 'word-hunt',
    mascot: 'curious',
    texture: 'dotted-target',
    headerLabel: 'WORD HUNT',
    ...COLOR_TOKEN.purple,
  },
  blast: {
    mode: 'blast',
    mascot: 'wild',
    texture: 'confetti-scatter',
    headerLabel: 'BLAST',
    ...COLOR_TOKEN.lime,
  },
};

export function getMpTheme(mode: MpDesktopMode): MpDesktopTheme {
  return MP_DESKTOP_THEMES[mode];
}

const MASCOT_GIF: Record<MpThemeMascot, string> = {
  focused: '/mascot/explorer-nobg.gif',
  excited: '/mascot/celebration.gif',
  curious: '/mascot/mindblown-nobg.gif',
  wild: '/mascot/flexing.gif',
};

const MASCOT_FALLBACK: Record<MpThemeMascot, string> = {
  focused: '/mascot/explorer-nobg.webp',
  excited: '/mascot/celebration.webp',
  curious: '/mascot/mindblown-nobg.webp',
  wild: '/mascot/flexing.webp',
};

export function getMascotSrc(pose: MpThemeMascot, reducedMotion: boolean): string {
  return reducedMotion ? MASCOT_FALLBACK[pose] : MASCOT_GIF[pose];
}
