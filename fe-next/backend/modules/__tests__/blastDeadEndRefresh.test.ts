/**
 * A player's board running out of words in an MP blast round refreshes THAT
 * player's board; the round keeps going for everyone else (boards are
 * independent and the round ends on the timer).
 */
import { describe, it, expect, vi } from 'vitest';
import { refreshBlastBoardOnDeadEnd } from '../blastBoardRegen';
import { initBlastModeState, getOrInitPlayerBoard } from '../blastModeManager';
import type { GameState } from '../gameState/types';

const GRID = [
  ['c', 'a', 't', 's'],
  ['d', 'o', 'g', 's'],
  ['b', 'i', 'r', 'd'],
  ['f', 'i', 's', 'h'],
];

function makeGame(users: string[]): GameState {
  const blastModeState = initBlastModeState(GRID, users, 1, 42);
  return {
    gameMode: 'blast',
    language: 'en',
    minWordLength: 3,
    users: Object.fromEntries(users.map((u) => [u, { username: u }])),
    blastModeState,
  } as unknown as GameState;
}

const io = {} as never;

describe('refreshBlastBoardOnDeadEnd', () => {
  it('Given two players, When one reports a dead end, Then only their board is refreshed and sent to them', () => {
    const game = makeGame(['Ada', 'Bo']);
    const ada = getOrInitPlayerBoard(game.blastModeState!, 'Ada');
    const bo = getOrInitPlayerBoard(game.blastModeState!, 'Bo');
    const boGrid = JSON.stringify(bo.grid);
    const socket = { emit: vi.fn(), connected: true };

    const outcome = refreshBlastBoardOnDeadEnd({ io, gameCode: 'R1', game, username: 'Ada', socket: socket as never, now: 10_000 });

    expect(outcome).toBe('regenerated');
    expect(ada.refillCount).toBe(1);
    expect(JSON.stringify(bo.grid)).toBe(boGrid);
    expect(socket.emit).toHaveBeenCalledWith('blastBoardUpdate', expect.objectContaining({ clearedBy: '__board_regenerated__' }));
  });

  it('Given a solo room, When the only player reports a dead end, Then the room may end', () => {
    const game = makeGame(['Ada']);
    const outcome = refreshBlastBoardOnDeadEnd({ io, gameCode: 'R1', game, username: 'Ada', now: 10_000 });
    expect(outcome).toBe('solo');
    expect(getOrInitPlayerBoard(game.blastModeState!, 'Ada').refillCount).toBe(0);
  });

  it('Given a board refreshed a moment ago, When a stale dead-end report arrives, Then it is not refreshed twice', () => {
    const game = makeGame(['Ada', 'Bo']);
    refreshBlastBoardOnDeadEnd({ io, gameCode: 'R1', game, username: 'Ada', now: 10_000 });
    const outcome = refreshBlastBoardOnDeadEnd({ io, gameCode: 'R1', game, username: 'Ada', now: 11_000 });
    expect(outcome).toBe('recent');
    expect(getOrInitPlayerBoard(game.blastModeState!, 'Ada').refillCount).toBe(1);
  });
});
