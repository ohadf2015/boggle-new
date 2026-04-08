/**
 * World 4: Idiom Archipelago Theme
 *
 * Tropical island world with palm trees and beaches.
 * Mechanic: Idiom matching challenges
 */

import { MessageCircle } from 'lucide-react';
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
  primary: 'neo-orange',
  secondary: 'neo-orange-light',
  accent: 'neo-yellow',
  backgroundTint: 'orange-900/20',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'neo-orange',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-neo-navy via-slate-900 to-teal-950',
  illustrationPath: '/images/adventure/backgrounds/archipelago.webp',
  layers: [
    {
      id: 'archipelago-sky',
      source: 'bg-linear-to-b from-neo-navy via-slate-900 to-teal-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'archipelago-far-islands',
      source: '/images/adventure/parallax/archipelago-far-islands.webp',
      depth: 0.25,
      opacity: 0.85,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'archipelago-mid-islands',
      source: '/images/adventure/parallax/archipelago-mid-islands.webp',
      depth: 0.4,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
    {
      id: 'archipelago-near-palms',
      source: '/images/adventure/parallax/archipelago-near-palms.webp',
      depth: 0.55,
      opacity: 0.95,
      className: 'absolute bottom-0 w-full h-1/2 object-cover',
    },
    {
      id: 'archipelago-foreground',
      source: '/images/adventure/parallax/archipelago-foreground.webp',
      depth: 0.7,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/3 object-cover',
    },
  ],
  texture: {
    type: 'grain',
    opacity: 0.04,
    blendMode: 'overlay',
  },
  particles: {
    type: 'droplets',
    variant: 'tropical',
    count: 12,
    colors: ['rgba(255,165,0,0.6)', 'rgba(255,200,100,0.5)', 'rgba(100,200,200,0.4)'],
    speed: 0.6,
    sizeRange: [8, 16],
  },
};

// ==============================================
// TILE STYLES (Tropical-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-100',
    gradientTo: 'cyan-200',
    borderColor: 'border-teal-500/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'orange-500',
    borderColor: 'border-orange-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 165, 0, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-orange-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-200',
    gradientTo: 'teal-400',
    borderColor: 'border-teal-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(0, 200, 200, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'orange-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 100, 50, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'orange-300',
    gradientTo: 'pink-400',
    borderColor: 'border-orange-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 150, 100, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-orange-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-300',
    gradientTo: 'orange-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 180, 50, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-300',
    gradientTo: 'cyan-500',
    borderColor: 'border-teal-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(50, 200, 180, 0.5)',
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
    gradientFrom: 'orange-400',
    gradientTo: 'amber-500',
    borderColor: 'border-orange-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 165, 0, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Idiom Matching)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: MessageCircle,
  backgroundColor: 'bg-neo-orange/20',
  borderColor: 'border-neo-orange',
  textColor: 'text-neo-orange',
  glowColor: 'rgba(255, 107, 53, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'wave',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-neo-orange scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.0,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.archipelago.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'neo-orange',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.archipelago.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'neo-yellow',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.archipelago.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'neo-cyan',
  },
];

// ==============================================
// HUD THEME (Orange/amber — tropical warm)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-amber-950/90',
  headerBorder: 'border-amber-800/40',
  sidebarBg: 'bg-amber-950/60',
  scoreAccent: 'text-orange-400',
  levelBadgeColor: 'bg-amber-900/60',
  levelBadgeText: 'text-orange-300',
  objectiveAccent: 'text-orange-400',
  hintActiveColor: 'bg-orange-500',
  hintActiveText: 'text-amber-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-amber-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-amber-950/95',
  dialogueBorder: 'border-orange-500/30',
  bossNameColor: 'text-orange-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-orange-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-orange-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(249, 115, 22, 0.4)',
  victoryGlow: 'rgba(251, 146, 60, 0.6)',
  arenaEffect: 'ocean-deck',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_4_THEME: WorldTheme = {
  id: 4,
  nameKey: 'adventure.worlds.idiomArchipelago',
  themeId: 'tropical-islands',
  mechanic: 'idioms',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-archipelago',
  hud,
  timerTheme,
  bossFight,
};
