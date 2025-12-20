/**
 * Host Hooks Barrel Export
 * Centralized export for all host-specific hooks
 */

export { default as useHostSocketEvents } from './useHostSocketEvents';
export {
  default as useHostViewState,
  type UseHostViewStateReturn,
  type Player,
  type TournamentData,
  type FinalScoresData,
  type XpGainedData,
  type LevelUpData,
  type GameSettings,
  type GameRuntimeState,
  type PlayerTrackingState,
  type HostPlayingState,
  type TournamentState,
  type AnimationState,
  type HostUIState,
  type ComboState,
  type XpState
} from './useHostViewState';
export { default as useHostGameActions, type UseHostGameActionsReturn } from './useHostGameActions';
export { default as useHostEffects } from './useHostEffects';
