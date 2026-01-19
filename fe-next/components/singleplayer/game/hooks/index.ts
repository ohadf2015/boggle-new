/**
 * Single Player Game Hooks
 * Extracted hooks for better code organization and testability
 */

export { useBotSimulation } from './useBotSimulation';
export { useSpamDetection } from './useSpamDetection';
export { useHintPrompt } from './useHintPrompt';
export { useRevealWord } from './useRevealWord';
export { usePauseControl } from './usePauseControl';
export { useWordSubmission } from './useWordSubmission';
export { useGameEnd } from './useGameEnd';
export { useGridInit } from './useGridInit';
export { useSinglePlayerCore } from './useSinglePlayerCore';

// Re-export types
export type { UseSpamDetectionReturn } from './useSpamDetection';
