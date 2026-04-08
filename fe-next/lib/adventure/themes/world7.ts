/**
 * World 7: Mirror Palace Theme
 *
 * Reflective glass palace with cyan/silver ice tones.
 * Mechanic: Mirror Match — palindrome and mirror-word challenges
 */

import { FlipHorizontal } from 'lucide-react';
import type {
  WorldTheme,
  TileStyleMap,
  WorldBackground,
  WorldAnimations,
  WorldColorPalette,
  ModifierDisplayConfig,
  ChapterConfig,
  HUDTheme,
  TimerUrgencyTheme,
  BossFightTheme,
} from './types';

// ==============================================
// COLOR PALETTE
// ==============================================

const colors: WorldColorPalette = {
  primary: 'sky-400',
  secondary: 'slate-300',
  accent: 'cyan-300',
  backgroundTint: 'sky-900/25',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'sky-400',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-slate-900 via-sky-950 to-cyan-950',
  illustrationPath: '/images/adventure/backgrounds/palace.webp',
  layers: [
    {
      id: 'palace-sky',
      source: 'bg-linear-to-b from-slate-900 via-sky-950 to-cyan-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'palace-mirrors-far',
      source: '/images/adventure/parallax/palace-mirrors-far.webp',
      depth: 0.25,
      opacity: 0.85,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'palace-reflections',
      source: '/images/adventure/parallax/palace-reflections.webp',
      depth: 0.45,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
  ],
  texture: {
    type: 'ice',
    opacity: 0.06,
    blendMode: 'overlay',
  },
  particles: {
    type: 'crystals',
    count: 10,
    colors: ['rgba(186,230,253,0.7)', 'rgba(224,242,254,0.6)', 'rgba(147,197,253,0.5)'],
    speed: 0.4,
    sizeRange: [8, 16],
  },
};

// ==============================================
// TILE STYLES (Mirror/Glass-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'sky-100',
    gradientTo: 'slate-200',
    borderColor: 'border-sky-400/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-200',
    gradientTo: 'amber-400',
    borderColor: 'border-amber-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 215, 0, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-sky-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'sky-200',
    gradientTo: 'cyan-400',
    borderColor: 'border-cyan-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(125, 211, 252, 0.6)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'rose-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 80, 80, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'sky-300',
    gradientTo: 'violet-400',
    borderColor: 'border-sky-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(125, 211, 252, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-sky-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'slate-300',
    gradientTo: 'sky-500',
    borderColor: 'border-slate-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(148, 163, 184, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-300',
    gradientTo: 'sky-500',
    borderColor: 'border-cyan-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(34, 211, 238, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-sky-900',
    showTexture: false,
    overlayType: 'clock',
  },
  locked: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'gray-600',
    gradientTo: 'gray-800',
    borderColor: 'border-gray-900',
    shadowStyle: 'hard',
    showTexture: false,
    overlayType: 'lock',
  },
  multiplier: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'sky-400',
    gradientTo: 'cyan-500',
    borderColor: 'border-sky-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(56, 189, 248, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Mirror Match)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: FlipHorizontal,
  backgroundColor: 'bg-sky-400/20',
  borderColor: 'border-sky-400',
  textColor: 'text-sky-400',
  glowColor: 'rgba(56, 189, 248, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'wave',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-sky-400 scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.0,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.palace.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'sky-400',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.palace.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'cyan-300',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.palace.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'slate-300',
  },
];

// ==============================================
// HUD THEME (Cyan/silver — reflective cool)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-sky-950/90',
  headerBorder: 'border-sky-800/40',
  sidebarBg: 'bg-sky-950/60',
  scoreAccent: 'text-sky-400',
  levelBadgeColor: 'bg-sky-900/60',
  levelBadgeText: 'text-sky-300',
  objectiveAccent: 'text-cyan-400',
  hintActiveColor: 'bg-sky-500',
  hintActiveText: 'text-sky-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-sky-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-sky-950/95',
  dialogueBorder: 'border-sky-400/30',
  bossNameColor: 'text-sky-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-sky-400'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-sky-400',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-sky-400/20', text: 'text-sky-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(56, 189, 248, 0.4)',
  victoryGlow: 'rgba(125, 211, 252, 0.6)',
  arenaEffect: 'mirror',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_7_THEME: WorldTheme = {
  id: 7,
  nameKey: 'adventure.worlds.mirrorPalace',
  themeId: 'reflective-glass',
  mechanic: 'mirrorMatch',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-palace',
  hud,
  timerTheme,
  bossFight,
};
