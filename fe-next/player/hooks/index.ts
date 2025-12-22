/**
 * Player Hooks Barrel Export
 * Centralized export for all player-specific hooks
 */

export { default as usePlayerSocketEvents } from './usePlayerSocketEvents';
export { default as usePlayerViewState, type UsePlayerViewStateReturn, type FoundWord, type WordToVote, type PlayerViewUIState, type PlayerViewActions } from './usePlayerViewState';
export { default as useComboSystem, type ComboState, type ComboRefs, type ComboActions, type UseComboSystemReturn } from './useComboSystem';
// Player type is now imported from @/hooks/useGameState
export type { Player } from '@/hooks/useGameState';
