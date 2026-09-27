/**
 * Duel Components Barrel Export
 *
 * Re-exports all duel-related components for clean imports.
 */

export { default as DuelLobby } from './DuelLobby';
// DuelChallengeModal is deliberately NOT re-exported: it opens only on a click,
// and re-exporting it here put it in the first-load chunk of both duel pages.
// Load it with next/dynamic at the render site (see DuelLobby / ChallengeButton).
export { DuelGameView } from './DuelGameView';
export { DuelHistory } from './DuelHistory';
export { default as DuelNotification } from './DuelNotification';
export { ChallengeButton } from './ChallengeButton';
export { RealTimeDuelGame } from './RealTimeDuelGame';
export { OpponentProgressBar } from './OpponentProgressBar';
export { DuelDisconnectOverlay } from './DuelDisconnectOverlay';
export { ForfeitConfirmDialog } from './ForfeitConfirmDialog';
