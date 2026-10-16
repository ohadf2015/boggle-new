import { describe, it, expect } from 'vitest';
import {
  BLAST_RESYNC_CLEARED_BY,
  INITIAL_BLAST_SYNC,
  blastSubmitPayload,
  noteBlastResyncRequested,
  noteBlastSubmit,
  receiveBlastBoard,
} from '../blastServerSync';

const ME = 'ana';

describe('receiveBlastBoard', () => {
  it('applies the ack of the only word in flight', () => {
    const s = noteBlastSubmit(INITIAL_BLAST_SYNC);
    const r = receiveBlastBoard(s, ME, ME);
    expect(r.apply).toBe(true);
    expect(r.state.pending).toBe(0);
  });

  it('drops an older ack while a newer word is still in flight (no rollback)', () => {
    const s = noteBlastSubmit(noteBlastSubmit(INITIAL_BLAST_SYNC));
    const first = receiveBlastBoard(s, ME, ME);
    expect(first.apply).toBe(false);
    const second = receiveBlastBoard(first.state, ME, ME);
    expect(second.apply).toBe(true);
  });

  it('applies a resync that no later word overtook, and clears words the server rejected', () => {
    const rejected = noteBlastSubmit(INITIAL_BLAST_SYNC);
    const asked = noteBlastResyncRequested(rejected);
    const r = receiveBlastBoard(asked, BLAST_RESYNC_CLEARED_BY, ME);
    expect(r.apply).toBe(true);
    expect(r.state.pending).toBe(0);
  });

  it('skips a resync when the player kept playing after asking, and keeps those words pending', () => {
    const asked = noteBlastResyncRequested(noteBlastSubmit(INITIAL_BLAST_SYNC));
    const playedOn = noteBlastSubmit(asked);
    const r = receiveBlastBoard(playedOn, BLAST_RESYNC_CLEARED_BY, ME);
    expect(r.apply).toBe(false);
    expect(r.state.pending).toBe(1);
  });

  it('always applies a reconnect snapshot and forgets anything in flight', () => {
    const s = noteBlastSubmit(noteBlastSubmit(INITIAL_BLAST_SYNC));
    const r = receiveBlastBoard(s, '__server_reconnect__', ME);
    expect(r.apply).toBe(true);
    expect(r.state.pending).toBe(0);
  });

  it('applies a fresh board only when nothing is in flight', () => {
    expect(receiveBlastBoard(INITIAL_BLAST_SYNC, '__board_regenerated__', ME).apply).toBe(true);
    expect(receiveBlastBoard(noteBlastSubmit(INITIAL_BLAST_SYNC), '__board_regenerated__', ME).apply).toBe(false);
  });
});

describe('blastSubmitPayload', () => {
  it('sends the dragged cells as bare row/col so the server cascades the same tiles', () => {
    const path = [{ row: 0, col: 1, letter: 'C', id: 'x' }, { row: 1, col: 1 }] as Array<{ row: number; col: number }>;
    expect(blastSubmitPayload('ca', 'line', path)).toEqual({
      word: 'ca',
      comboType: 'line',
      path: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
    });
  });

  it('omits a path the submit schema would refuse, so one off-grid cell never rejects the word', () => {
    expect(blastSubmitPayload('ca', null, [{ row: 11, col: 0 }, { row: 0, col: 0 }])).toEqual({ word: 'ca', comboType: null });
  });

  it('omits the path when there is none, so the server falls back to its own route', () => {
    expect(blastSubmitPayload('ca', null)).toEqual({ word: 'ca', comboType: null });
  });
});
