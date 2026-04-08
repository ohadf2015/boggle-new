/**
 * World 9: Polyglot Peaks Theme
 *
 * Mountain world with aurora borealis and teal/aurora tones.
 * Mechanic: Babel Summit — multilingual word challenges
 */

import { Globe } from 'lucide-react';
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
  primary: 'teal-500',
  secondary: 'emerald-400',
  accent: 'cyan-400',
  backgroundTint: 'teal-900/25',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'teal-500',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-slate-950 via-teal-950 to-emerald-950',
  illustrationPath: '/images/adventure/backgrounds/peaks.webp',
  layers: [
    {
      id: 'peaks-sky',
      source: 'bg-linear-to-b from-slate-950 via-teal-950 to-emerald-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'peaks-aurora',
      source: '/images/adventure/parallax/peaks-aurora.webp',
      depth: 0.2,
      opacity: 0.85,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'peaks-mountains',
      source: '/images/adventure/parallax/peaks-mountains.webp',
      depth: 0.4,
      opacity: 0.95,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
  ],
  texture: {
    type: 'ice',
    opacity: 0.05,
    blendMode: 'overlay',
  },
  particles: {
    type: 'snowflakes',
    count: 12,
    colors: ['rgba(204,251,241,0.7)', 'rgba(153,246,228,0.6)', 'rgba(94,234,212,0.5)'],
    speed: 0.5,
    sizeRange: [6, 12],
  },
};

// ==============================================
// TILE STYLES (Mountain/Aurora-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-100',
    gradientTo: 'emerald-200',
    borderColor: 'border-teal-500/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'amber-400',
    borderColor: 'border-amber-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 215, 0, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-teal-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-200',
    gradientTo: 'cyan-400',
    borderColor: 'border-teal-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(94, 234, 212, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'orange-500',
    borderColor: 'border-red-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 80, 50, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-300',
    gradientTo: 'cyan-500',
    borderColor: 'border-teal-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(20, 184, 166, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-teal-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'emerald-300',
    gradientTo: 'teal-500',
    borderColor: 'border-emerald-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(52, 211, 153, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-300',
    gradientTo: 'teal-500',
    borderColor: 'border-cyan-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(34, 211, 238, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-teal-900',
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
    gradientFrom: 'teal-400',
    gradientTo: 'emerald-500',
    borderColor: 'border-teal-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(20, 184, 166, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Babel Summit)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: Globe,
  backgroundColor: 'bg-teal-500/20',
  borderColor: 'border-teal-500',
  textColor: 'text-teal-400',
  glowColor: 'rgba(20, 184, 166, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'slide-up',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-teal-500 scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.0,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.peaks.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'teal-500',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.peaks.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'emerald-400',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.peaks.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'cyan-400',
  },
];

// ==============================================
// HUD THEME (Teal/aurora — mountain cool)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-teal-950/90',
  headerBorder: 'border-teal-800/40',
  sidebarBg: 'bg-teal-950/60',
  scoreAccent: 'text-teal-400',
  levelBadgeColor: 'bg-teal-900/60',
  levelBadgeText: 'text-teal-300',
  objectiveAccent: 'text-emerald-400',
  hintActiveColor: 'bg-teal-500',
  hintActiveText: 'text-teal-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-teal-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-teal-950/95',
  dialogueBorder: 'border-teal-500/30',
  bossNameColor: 'text-teal-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-teal-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-teal-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(20, 184, 166, 0.4)',
  victoryGlow: 'rgba(94, 234, 212, 0.6)',
  arenaEffect: 'aurora',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_9_THEME: WorldTheme = {
  id: 9,
  nameKey: 'adventure.worlds.polyglotPeaks',
  themeId: 'mountain-aurora',
  mechanic: 'babelSummit',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-peaks',
  hud,
  timerTheme,
  bossFight,
};
