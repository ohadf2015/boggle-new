/**
 * Preset Configuration for Single Player Mode
 * Provides quick-start presets similar to multiplayer game settings
 */

import type { DifficultyLevel } from '@/shared/types/game';
import type { SinglePlayerMode } from './SinglePlayerView';
import { Zap, Target, Flame, Users, BookOpen, Trophy, Timer, type LucideIcon } from 'lucide-react';

export interface PresetSettings {
  difficulty: DifficultyLevel;
  timerSeconds: number;
  bots: number;
  botDifficulty: 'easy' | 'medium' | 'hard';
  minWordLength?: number; // Minimum word length (defaults to 2 for all presets)
}

export interface PresetConfig {
  id: string;
  nameKey: string;
  descKey: string;
  Icon: LucideIcon;
  color: string; // Tailwind gradient
  bgColor: string; // Background color class
  settings: PresetSettings;
  modes: SinglePlayerMode[]; // Which modes this preset is available for
  badge?: string; // Optional badge like "Popular", "Recommended"
  isDefault?: boolean;
}

/**
 * Presets for quick game configuration
 * Each preset provides a complete set of game settings
 */
export const PRESETS: PresetConfig[] = [
  // Quick Play - Fast 1-minute game on 7x7 board
  {
    id: 'quick',
    nameKey: 'singlePlayer.preset.quick',
    descKey: 'singlePlayer.preset.quickDesc',
    Icon: Zap,
    color: 'from-neo-cyan to-cyan-400',
    bgColor: 'bg-neo-cyan',
    settings: {
      difficulty: 'MEDIUM', // 7x7 board
      timerSeconds: 60,
      bots: 1,
      botDifficulty: 'easy',
      minWordLength: 2,
    },
    modes: ['solo-bots', 'practice', 'challenge'],
  },
  // Standard - Balanced classic game (Default)
  {
    id: 'standard',
    nameKey: 'singlePlayer.preset.standard',
    descKey: 'singlePlayer.preset.standardDesc',
    Icon: Target,
    color: 'from-neo-lime to-yellow-400',
    bgColor: 'bg-neo-lime',
    settings: {
      difficulty: 'MEDIUM',
      timerSeconds: 120,
      bots: 2,
      botDifficulty: 'medium',
      minWordLength: 2, // Accept 2-letter words (especially for Japanese)
    },
    modes: ['solo-bots', 'practice', 'challenge'],
    badge: 'recommended',
    isDefault: true,
  },
  // Intense - Large board, more time
  {
    id: 'intense',
    nameKey: 'singlePlayer.preset.intense',
    descKey: 'singlePlayer.preset.intenseDesc',
    Icon: Flame,
    color: 'from-neo-red to-neo-pink',
    bgColor: 'bg-neo-red',
    settings: {
      difficulty: 'HARD',
      timerSeconds: 180,
      bots: 2,
      botDifficulty: 'hard',
      minWordLength: 2, // Accept 2-letter words (especially for Japanese)
    },
    modes: ['solo-bots', 'practice', 'challenge'],
  },
];

/**
 * Mode-specific presets for the custom game flow
 */
export const MODE_PRESETS: Record<SinglePlayerMode, PresetConfig[]> = {
  'solo-bots': [
    {
      id: 'friendly',
      nameKey: 'singlePlayer.preset.friendly',
      descKey: 'singlePlayer.preset.friendlyDesc',
      Icon: Users,
      color: 'from-neo-lime to-lime-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'EASY',
        timerSeconds: 90,
        bots: 1,
        botDifficulty: 'medium',
        minWordLength: 2, // EASY preset accepts 2-letter words
      },
      modes: ['solo-bots'],
      isDefault: true,
    },
    {
      id: 'competitive',
      nameKey: 'singlePlayer.preset.competitive',
      descKey: 'singlePlayer.preset.competitiveDesc',
      Icon: Target,
      color: 'from-neo-lime to-yellow-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'MEDIUM',
        timerSeconds: 120,
        bots: 2,
        botDifficulty: 'medium',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['solo-bots'],
    },
    {
      id: 'battle',
      nameKey: 'singlePlayer.preset.battle',
      descKey: 'singlePlayer.preset.battleDesc',
      Icon: Flame,
      color: 'from-neo-red to-red-400',
      bgColor: 'bg-neo-red',
      settings: {
        difficulty: 'HARD',
        timerSeconds: 180,
        bots: 3,
        botDifficulty: 'hard',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['solo-bots'],
    },
  ],
  'practice': [
    {
      id: 'explorer',
      nameKey: 'singlePlayer.preset.explorer',
      descKey: 'singlePlayer.preset.explorerDesc',
      Icon: BookOpen,
      color: 'from-neo-lime to-lime-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'EASY',
        timerSeconds: 0, // No timer for practice
        bots: 0,
        botDifficulty: 'easy',
        minWordLength: 2, // EASY preset accepts 2-letter words
      },
      modes: ['practice'],
      isDefault: true,
    },
    {
      id: 'hunter',
      nameKey: 'singlePlayer.preset.hunter',
      descKey: 'singlePlayer.preset.hunterDesc',
      Icon: Target,
      color: 'from-neo-cyan to-cyan-400',
      bgColor: 'bg-neo-cyan',
      settings: {
        difficulty: 'MEDIUM',
        timerSeconds: 0,
        bots: 0,
        botDifficulty: 'medium',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['practice'],
    },
    {
      id: 'mastery',
      nameKey: 'singlePlayer.preset.mastery',
      descKey: 'singlePlayer.preset.masteryDesc',
      Icon: Trophy,
      color: 'from-neo-lime to-yellow-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'HARD',
        timerSeconds: 0,
        bots: 0,
        botDifficulty: 'hard',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['practice'],
    },
  ],
  'challenge': [
    {
      id: 'warmup',
      nameKey: 'singlePlayer.preset.warmup',
      descKey: 'singlePlayer.preset.warmupDesc',
      Icon: Timer,
      color: 'from-neo-lime to-lime-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'EASY',
        timerSeconds: 60,
        bots: 0,
        botDifficulty: 'easy',
        minWordLength: 2, // EASY preset accepts 2-letter words
      },
      modes: ['challenge'],
    },
    {
      id: 'personal-best',
      nameKey: 'singlePlayer.preset.personalBest',
      descKey: 'singlePlayer.preset.personalBestDesc',
      Icon: Trophy,
      color: 'from-neo-lime to-yellow-400',
      bgColor: 'bg-neo-lime',
      settings: {
        difficulty: 'MEDIUM',
        timerSeconds: 120,
        bots: 0,
        botDifficulty: 'medium',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['challenge'],
      isDefault: true,
    },
    {
      id: 'ultra',
      nameKey: 'singlePlayer.preset.ultra',
      descKey: 'singlePlayer.preset.ultraDesc',
      Icon: Flame,
      color: 'from-neo-red to-neo-pink',
      bgColor: 'bg-neo-red',
      settings: {
        difficulty: 'HARD',
        timerSeconds: 180,
        bots: 0,
        botDifficulty: 'hard',
        minWordLength: 2, // Accept 2-letter words (especially for Japanese)
      },
      modes: ['challenge'],
    },
  ],
};

/**
 * Get presets available for a specific mode
 */
export function getPresetsForMode(mode: SinglePlayerMode): PresetConfig[] {
  return MODE_PRESETS[mode] || [];
}

/**
 * Get the default preset for a mode
 */
export function getDefaultPreset(mode: SinglePlayerMode): PresetConfig | undefined {
  const presets = getPresetsForMode(mode);
  return presets.find(p => p.isDefault) || presets[0];
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): PresetConfig | undefined {
  // Check main presets first
  const mainPreset = PRESETS.find(p => p.id === id);
  if (mainPreset) return mainPreset;

  // Check mode-specific presets
  for (const modePresets of Object.values(MODE_PRESETS)) {
    const preset = modePresets.find(p => p.id === id);
    if (preset) return preset;
  }
  return undefined;
}

/**
 * Get the minimum word length based on language and difficulty
 * - Japanese: Always 2+ letters (all difficulties)
 * - Other languages: Hard difficulty = 3+ letters, others = 2+ letters
 */
export function getMinWordLength(language: string, difficulty: DifficultyLevel): number {
  // Japanese always allows 2-letter words (important for the language)
  if (language === 'ja') {
    return 2;
  }

  // For other languages: Hard difficulty requires 3+ letters
  if (difficulty === 'HARD') {
    return 3;
  }

  // Easy and Medium allow 2+ letters
  return 2;
}
