/**
 * World 8: Neologism Nebula Theme
 *
 * Cosmic space world with stars and purple/indigo nebulae.
 * Mechanic: Stellar Forge — rare/invented word challenges
 */

import { Sparkles } from 'lucide-react';
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
  primary: 'indigo-500',
  secondary: 'violet-400',
  accent: 'purple-400',
  backgroundTint: 'indigo-900/30',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'indigo-500',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-slate-950 via-indigo-950 to-violet-950',
  illustrationPath: '/images/adventure/backgrounds/nebula.webp',
  layers: [
    {
      id: 'nebula-void',
      source: 'bg-linear-to-b from-slate-950 via-indigo-950 to-violet-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'nebula-stars-far',
      source: '/images/adventure/parallax/nebula-stars-far.webp',
      depth: 0.2,
      opacity: 0.9,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'nebula-clouds',
      source: '/images/adventure/parallax/nebula-clouds.webp',
      depth: 0.4,
      opacity: 0.8,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
  ],
  texture: {
    type: 'none',
    opacity: 0,
    blendMode: 'normal',
  },
  particles: {
    type: 'sparkles',
    count: 15,
    colors: ['rgba(129,140,248,0.8)', 'rgba(167,139,250,0.7)', 'rgba(196,181,253,0.6)'],
    speed: 0.3,
    sizeRange: [4, 10],
  },
};

// ==============================================
// TILE STYLES (Space-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'indigo-200',
    gradientTo: 'violet-300',
    borderColor: 'border-indigo-500/40',
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
    badgeBackground: 'bg-indigo-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'indigo-200',
    gradientTo: 'blue-400',
    borderColor: 'border-indigo-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(129, 140, 248, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'rose-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 50, 80, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'violet-400',
    gradientTo: 'indigo-600',
    borderColor: 'border-violet-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(167, 139, 250, 0.6)',
    badgeText: '*',
    badgeBackground: 'bg-violet-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'indigo-400',
    gradientTo: 'violet-600',
    borderColor: 'border-indigo-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(99, 102, 241, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'violet-300',
    gradientTo: 'purple-500',
    borderColor: 'border-violet-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(139, 92, 246, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-violet-900',
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
    gradientFrom: 'indigo-400',
    gradientTo: 'purple-500',
    borderColor: 'border-indigo-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(99, 102, 241, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Stellar Forge)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: Sparkles,
  backgroundColor: 'bg-indigo-500/20',
  borderColor: 'border-indigo-500',
  textColor: 'text-indigo-400',
  glowColor: 'rgba(99, 102, 241, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'zoom',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-indigo-500 scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 0.8,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.nebula.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'indigo-500',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.nebula.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'violet-400',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.nebula.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'purple-400',
  },
];

// ==============================================
// HUD THEME (Purple/indigo — cosmic deep)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-indigo-950/90',
  headerBorder: 'border-indigo-800/40',
  sidebarBg: 'bg-indigo-950/60',
  scoreAccent: 'text-indigo-400',
  levelBadgeColor: 'bg-indigo-900/60',
  levelBadgeText: 'text-indigo-300',
  objectiveAccent: 'text-violet-400',
  hintActiveColor: 'bg-indigo-500',
  hintActiveText: 'text-indigo-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-indigo-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-indigo-950/95',
  dialogueBorder: 'border-indigo-500/30',
  bossNameColor: 'text-indigo-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-indigo-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-indigo-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(99, 102, 241, 0.4)',
  victoryGlow: 'rgba(129, 140, 248, 0.6)',
  arenaEffect: 'starfield',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_8_THEME: WorldTheme = {
  id: 8,
  nameKey: 'adventure.worlds.neologismNebula',
  themeId: 'space-stars',
  mechanic: 'stellarForge',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-nebula',
  hud,
  timerTheme,
  bossFight,
};
