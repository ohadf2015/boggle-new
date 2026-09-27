/**
 * The multiplayer page as a small state machine. Pure resolvers only — the
 * routers (`MpPhaseRouter`, `MultiplayerFlow`) render from these, and the
 * tables in `__tests__/mpPhase.test.ts` are the contract.
 */
import type { ActiveRoom } from '@/shared/types/game';

// ─── Page phase (PageClient → MpPhaseRouter) ────────────────────────────────

export type MpPagePhase = 'entry' | 'host' | 'player' | 'results';

export interface MpPagePhaseInput {
  showResults: boolean;
  /** A Vocab Quiz owns its own podium (see quizOwnsRoundEnd). */
  quizEndsThisRound: boolean;
  isActive: boolean;
  isHost: boolean;
}

export function resolveMpPagePhase({ showResults, quizEndsThisRound, isActive, isHost }: MpPagePhaseInput): MpPagePhase {
  if (showResults && !quizEndsThisRound) return 'results';
  if (!isActive) return 'entry';
  return isHost ? 'host' : 'player';
}

// ─── Entry flow (MultiplayerFlow) ───────────────────────────────────────────

export type EntryFlowView = 'room-list' | 'join-modal' | 'create-modal';

export interface EntryFlowState {
  view: EntryFlowView;
  /** The room the join sheet is for. */
  selectedRoom: ActiveRoom | null;
}

export type EntryFlowEvent =
  | { type: 'OPEN_CREATE' }
  | { type: 'OPEN_JOIN'; room: ActiveRoom }
  | { type: 'CLOSE' };

export const INITIAL_ENTRY_FLOW: EntryFlowState = { view: 'room-list', selectedRoom: null };

export function entryFlowReducer(state: EntryFlowState, event: EntryFlowEvent): EntryFlowState {
  switch (event.type) {
    case 'OPEN_CREATE':
      return { view: 'create-modal', selectedRoom: null };
    case 'OPEN_JOIN':
      return { view: 'join-modal', selectedRoom: event.room };
    case 'CLOSE':
      return INITIAL_ENTRY_FLOW;
    default:
      return state;
  }
}

export type EntryView = 'lobby' | 'seeking' | 'classroom-waiting' | 'classroom-name';

export interface EntryViewInput {
  isClassroomMode: boolean;
  prefilledRoom: string;
  needsClassroomName: boolean;
  isSeekingOverlay: boolean;
}

/**
 * Classroom joins with a room code own the screen (name prompt, then a waiting
 * loader). Without a room there is nothing to wait for, so a classroom visitor
 * falls through to the normal lobby — never a spinner that cannot resolve.
 */
export function resolveEntryView({ isClassroomMode, prefilledRoom, needsClassroomName, isSeekingOverlay }: EntryViewInput): EntryView {
  if (isClassroomMode && prefilledRoom) return needsClassroomName ? 'classroom-name' : 'classroom-waiting';
  if (isSeekingOverlay) return 'seeking';
  return 'lobby';
}
