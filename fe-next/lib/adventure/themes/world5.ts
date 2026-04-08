/**
 * World 5: Compound Canyon Theme
 *
 * Desert canyon world with red rocks and tumbleweeds.
 * Mechanic: Compound word bonuses (+30%)
 */

import { Plus } from 'lucide-react';
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
  primary: 'neo-red',
  secondary: 'red-400',
  accent: 'neo-orange',
  backgroundTint: 'red-900/20',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'neo-red',
  warning: 'neo-orange',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-neo-navy via-slate-900 to-amber-950',
  illustrationPath: '/images/adventure/backgrounds/canyon.webp',
  layers: [
    {
      id: 'canyon-sky',
      source: 'bg-linear-to-b from-neo-navy via-slate-900 to-amber-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'canyon-distant-cliffs',
      source: '/images/adventure/parallax/canyon-distant-cliffs.webp',
      depth: 0.2,
      opacity: 0.85,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'canyon-mid-formations',
      source: '/images/adventure/parallax/canyon-mid-formations.webp',
      depth: 0.35,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
    {
      id: 'canyon-near-walls',
      source: '/images/adventure/parallax/canyon-near-walls.webp',
      depth: 0.5,
      opacity: 0.95,
      className: 'absolute bottom-0 w-full h-1/2 object-cover',
    },
    {
      id: 'canyon-foreground',
      source: '/images/adventure/parallax/canyon-foreground.webp',
      depth: 0.65,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/3 object-cover',
    },
  ],
  texture: {
    type: 'stone',
    opacity: 0.06,
    blendMode: 'soft-light',
  },
  particles: {
    type: 'dust',
    variant: 'desert',
    count: 10,
    colors: ['rgba(210,180,140,0.5)', 'rgba(188,143,79,0.4)', 'rgba(160,120,80,0.3)'],
    speed: 1.0,
    sizeRange: [6, 14],
  },
};

// ==============================================
// TILE STYLES (Desert-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-100',
    gradientTo: 'orange-200',
    borderColor: 'border-red-500/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'orange-500',
    borderColor: 'border-red-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 100, 50, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-red-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'orange-200',
    gradientTo: 'amber-400',
    borderColor: 'border-orange-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 150, 100, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'red-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 50, 50, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-300',
    gradientTo: 'orange-400',
    borderColor: 'border-red-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 100, 50, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-red-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-300',
    gradientTo: 'red-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 130, 50, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'orange-300',
    gradientTo: 'amber-500',
    borderColor: 'border-orange-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 165, 0, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-orange-900',
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
    gradientFrom: 'red-400',
    gradientTo: 'orange-500',
    borderColor: 'border-red-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 80, 50, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Compound Words)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: Plus,
  backgroundColor: 'bg-neo-red/20',
  borderColor: 'border-neo-red',
  textColor: 'text-neo-red',
  glowColor: 'rgba(255, 0, 0, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'slide-up',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-neo-red scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.0,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.canyon.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'neo-red',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.canyon.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'neo-orange',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.canyon.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'neo-yellow',
  },
];

// ==============================================
// HUD THEME (Red/copper — arid intense)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-red-950/90',
  headerBorder: 'border-red-800/40',
  sidebarBg: 'bg-red-950/60',
  scoreAccent: 'text-red-400',
  levelBadgeColor: 'bg-red-900/60',
  levelBadgeText: 'text-red-300',
  objectiveAccent: 'text-orange-400',
  hintActiveColor: 'bg-red-500',
  hintActiveText: 'text-red-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-red-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-red-950/95',
  dialogueBorder: 'border-red-500/30',
  bossNameColor: 'text-red-400',
  hpSegmentColors: ['bg-red-600', 'bg-amber-500', 'bg-orange-500'],
  telegraphColor: 'bg-red-600/20',
  telegraphProgressColor: 'bg-red-600',
  playerHealthNormal: 'bg-orange-500',
  playerHealthLow: 'bg-red-600',
  phaseColors: {
    phase1: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-600/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(220, 38, 38, 0.4)',
  victoryGlow: 'rgba(248, 113, 113, 0.6)',
  arenaEffect: 'gear-factory',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_5_THEME: WorldTheme = {
  id: 5,
  nameKey: 'adventure.worlds.compoundCanyon',
  themeId: 'desert-cliffs',
  mechanic: 'compounds',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-canyon',
  hud,
  timerTheme,
  bossFight,
};
