/**
 * Shared types for single player game components and hooks
 */

import type { TrainingHintType } from '@/hooks/useTrainingAnalysis';

export interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

export interface KeyboardInputState {
  isTypingMode: boolean;
  typedWord: string;
  highlightedCells: Array<{ row: number; col: number }>;
}

export interface TrainingState {
  completedSkills: Set<string>;
  justUnlocked: string | null;
  isComplete: boolean;
  currentHint: TrainingHintType | null;
  hasPassed: boolean;
  clearJustUnlocked: () => void;
  dismissHint: () => void;
}

export interface DirectionGuidanceState {
  showDirectionGuidance: boolean;
  dismissDirectionGuidance: () => void;
}
