/**
 * WordCraft Match State Tests
 * Prove: rack ownership server-side, move validation, turn progression
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initWordCraftMatch,
  validateWordCraftMove,
  applyWordCraftMove,
  applyWordCraftPass,
  applyWordCraftTimeout,
} from '../matchState';
import type { WordCraftGameState, WordCraftPlacement } from '@/shared/types/wordcraft';
import type { Tile } from '../../types';

describe('WordCraft Match State', () => {
  let initialState: WordCraftGameState;

  beforeEach(() => {
    const mockBoard: Tile[][] = Array(6)
      .fill(null)
      .map(() => Array(6).fill(null));

    const mockBag: Tile[] = Array.from({ length: 50 }, (_, i) => ({
      id: `tile-${i}`,
      letter: String.fromCharCode(65 + (i % 26)), // A-Z
    }));

    initialState = initWordCraftMatch({
      player1Username: 'alice',
      player2Username: 'bob',
      board: mockBoard,
      bag: mockBag,
      roomId: 'room-123',
    });
  });

  describe('initWordCraftMatch', () => {
    it('should initialize both players with 7 tiles each', () => {
      expect(initialState.player1.rack).toHaveLength(7);
      expect(initialState.player2.rack).toHaveLength(7);
    });

    it('should start with player1 turn', () => {
      expect(initialState.turn).toBe('player1');
    });

    it('should mark game as human-only', () => {
      expect(initialState.humansOnly).toBe(true);
    });

    it('should consume 14 tiles from bag', () => {
      // 50 initial - 14 drawn = 36 remaining
      expect(initialState.bag).toHaveLength(36);
    });
  });

  describe('validateWordCraftMove', () => {
    it('should reject placements with tiles not in player rack', async () => {
      const placement: WordCraftPlacement = {
        tileId: 'nonexistent-tile',
        pos: { row: 0, col: 0 },
        letter: 'A',
      };

      const result = await validateWordCraftMove({
        state: initialState,
        placements: [placement],
        rackTiles: [],
        player: 'player1',
        validator: async () => true, // Mock validator
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_RACK_TILE');
    });

    it('should reject duplicate tiles in one move', async () => {
      const tile = initialState.player1.rack[0];
      const placements: WordCraftPlacement[] = [
        { tileId: tile.id, pos: { row: 0, col: 0 }, letter: 'A' },
        { tileId: tile.id, pos: { row: 0, col: 1 }, letter: 'A' }, // Same tile twice
      ];

      const result = await validateWordCraftMove({
        state: initialState,
        placements,
        rackTiles: [],
        player: 'player1',
        validator: async () => true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('DUPLICATE_TILE_IN_MOVE');
    });

    it('should reject placements on occupied board positions', async () => {
      // Place a tile on board
      initialState.board[0][0] = { id: 'existing', letter: 'X' };

      const tile = initialState.player1.rack[0];
      const placement: WordCraftPlacement = {
        tileId: tile.id,
        pos: { row: 0, col: 0 }, // Occupied!
        letter: 'A',
      };

      const result = await validateWordCraftMove({
        state: initialState,
        placements: [placement],
        rackTiles: [],
        player: 'player1',
        validator: async () => true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('BOARD_POSITION_OCCUPIED');
    });

    it('should accept valid move with rack tiles only', async () => {
      const tile = initialState.player1.rack[0];
      const placement: WordCraftPlacement = {
        tileId: tile.id,
        pos: { row: 0, col: 0 },
        letter: tile.letter,
      };

      const result = await validateWordCraftMove({
        state: initialState,
        placements: [placement],
        rackTiles: [{ id: tile.id, letter: tile.letter }],
        player: 'player1',
        validator: async () => true,
      });

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('applyWordCraftMove', () => {
    it('should place tiles on board and remove from rack', () => {
      const tile = initialState.player1.rack[0];
      const placement: WordCraftPlacement = {
        tileId: tile.id,
        pos: { row: 2, col: 2 },
        letter: tile.letter,
      };

      const newState = applyWordCraftMove(initialState, 'player1', [placement], 10);

      expect(newState.board[2][2]).toEqual({ id: tile.id, letter: tile.letter });
      expect(newState.player1.rack.map((t) => t.id)).not.toContain(tile.id);
      expect(newState.usedTiles.has(tile.id)).toBe(true);
    });

    it('should replenish rack from bag', () => {
      const originalBagSize = initialState.bag.length;
      const tile = initialState.player1.rack[0];
      const placement: WordCraftPlacement = {
        tileId: tile.id,
        pos: { row: 2, col: 2 },
        letter: tile.letter,
      };

      const newState = applyWordCraftMove(initialState, 'player1', [placement], 10);

      expect(newState.player1.rack).toHaveLength(7); // Still 7 after replenish
      expect(newState.bag).toHaveLength(originalBagSize - 1); // One less in bag
    });

    it('should update score and advance turn', () => {
      const tile = initialState.player1.rack[0];
      const placement: WordCraftPlacement = {
        tileId: tile.id,
        pos: { row: 2, col: 2 },
        letter: tile.letter,
      };

      const newState = applyWordCraftMove(initialState, 'player1', [placement], 25);

      expect(newState.player1.score).toBe(25);
      expect(newState.turn).toBe('player2');
      expect(newState.consecutivePasses).toBe(0);
    });
  });

  describe('applyWordCraftPass', () => {
    it('should advance turn on first pass', () => {
      const newState = applyWordCraftPass(initialState);

      expect(newState.turn).toBe('player2');
      expect(newState.consecutivePasses).toBe(1);
      expect(newState.gameStatus).toBe('in-progress');
    });

    it('should end game on second consecutive pass', () => {
      const afterPass1 = applyWordCraftPass(initialState);
      const afterPass2 = applyWordCraftPass(afterPass1);

      expect(afterPass2.gameStatus).toBe('finished');
      expect(afterPass2.winner).toBeDefined();
    });
  });

  describe('applyWordCraftTimeout', () => {
    it('should end game and award win to opponent', () => {
      initialState.player1.score = 50;
      initialState.player2.score = 30;

      const newState = applyWordCraftTimeout(initialState, 'player1');

      expect(newState.gameStatus).toBe('finished');
      expect(newState.winner).toBe('player2');
    });
  });
});
