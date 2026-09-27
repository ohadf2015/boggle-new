import { describe, it, expect } from 'vitest';
import {
  resolveMpPagePhase,
  entryFlowReducer,
  INITIAL_ENTRY_FLOW,
  resolveEntryView,
  type EntryFlowState,
} from '../mpPhase';
import type { ActiveRoom } from '@/shared/types/game';

/**
 * The multiplayer page is a small state machine. These tables are the
 * contract the routers (MpPhaseRouter, MultiplayerFlow) render from.
 */
describe('resolveMpPagePhase — which top-level screen the MP page shows', () => {
  const base = { showResults: false, quizEndsThisRound: false, isActive: false, isHost: false };

  it.each([
    [{ ...base }, 'entry'],
    [{ ...base, isActive: true }, 'player'],
    [{ ...base, isActive: true, isHost: true }, 'host'],
    [{ ...base, isActive: true, showResults: true }, 'results'],
    [{ ...base, isActive: true, isHost: true, showResults: true }, 'results'],
    // A Vocab Quiz owns its own podium: results never take the screen from it.
    [{ ...base, isActive: true, isHost: true, showResults: true, quizEndsThisRound: true }, 'host'],
    [{ ...base, isActive: true, showResults: true, quizEndsThisRound: true }, 'player'],
    // Results win over a transient disconnect (isActive false) — same as before the split.
    [{ ...base, showResults: true }, 'results'],
  ] as const)('%o → %s', (input, expected) => {
    expect(resolveMpPagePhase(input)).toBe(expected);
  });
});

describe('entryFlowReducer — room list with create / join sheets', () => {
  const room = { gameCode: 'ABC123', roomName: 'r' } as ActiveRoom;

  it('starts on the room list, or the create sheet when autoCreate', () => {
    expect(INITIAL_ENTRY_FLOW).toEqual({ view: 'room-list', selectedRoom: null });
    expect(entryFlowReducer(INITIAL_ENTRY_FLOW, { type: 'OPEN_CREATE' }).view).toBe('create-modal');
  });

  it('opens the join sheet for a room and remembers it', () => {
    const s = entryFlowReducer(INITIAL_ENTRY_FLOW, { type: 'OPEN_JOIN', room });
    expect(s).toEqual({ view: 'join-modal', selectedRoom: room });
  });

  it('CLOSE returns to the room list and forgets the room', () => {
    const open: EntryFlowState = { view: 'join-modal', selectedRoom: room };
    expect(entryFlowReducer(open, { type: 'CLOSE' })).toEqual(INITIAL_ENTRY_FLOW);
  });

  it('opening create from join drops the selected room', () => {
    const open: EntryFlowState = { view: 'join-modal', selectedRoom: room };
    expect(entryFlowReducer(open, { type: 'OPEN_CREATE' })).toEqual({ view: 'create-modal', selectedRoom: null });
  });
});

describe('resolveEntryView — what the entry screen shows', () => {
  const base = { isClassroomMode: false, prefilledRoom: '', needsClassroomName: false, isSeekingOverlay: false };

  it.each([
    [{ ...base }, 'lobby'],
    [{ ...base, isSeekingOverlay: true }, 'seeking'],
    [{ ...base, isClassroomMode: true }, 'lobby'], // no room to join: never a dead spinner
    [{ ...base, isClassroomMode: true, prefilledRoom: 'AB' }, 'classroom-waiting'],
    [{ ...base, isClassroomMode: true, prefilledRoom: 'AB', needsClassroomName: true }, 'classroom-name'],
    [{ ...base, isClassroomMode: true, prefilledRoom: 'AB', isSeekingOverlay: true }, 'classroom-waiting'],
  ] as const)('%o → %s', (input, expected) => {
    expect(resolveEntryView(input)).toBe(expected);
  });
});
