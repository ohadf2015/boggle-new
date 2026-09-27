/**
 * Test: MP game tracking via trackMpGameStart/trackMpGameEnd
 * Verifies that PostHog events include correct MP-specific properties
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackMpGameStart, trackMpGameEnd } from '../mpGameTracking';

// Mock the base tracking functions
const mockTrackGameStart = vi.fn();
const mockTrackGameEnd = vi.fn();

vi.mock('../growthTracking', () => ({
  trackGameStart: (mode: string, extras: unknown) => mockTrackGameStart(mode, extras),
  trackGameEnd: (mode: string, score: number, words: number, completed: boolean, duration: number, extras: unknown) =>
    mockTrackGameEnd(mode, score, words, completed, duration, extras),
}));

describe('MP Game Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackMpGameStart', () => {
    it('should emit game_started with gameMode and isMultiplayer:true for classic', () => {
      trackMpGameStart({
        gameMode: 'classic',
        roundIndex: 0,
        playerCount: 3,
        gameCode: 'ABC123',
      });

      expect(mockTrackGameStart).toHaveBeenCalledWith('multiplayer', {
        gameMode: 'classic',
        engineMode: 'multiplayer',
        isMultiplayer: true,
        roundIndex: 0,
        playerCount: 3,
        gameCode: 'ABC123',
      });
    });

    it('should emit game_started with gameMode=blast', () => {
      trackMpGameStart({
        gameMode: 'blast',
        roundIndex: 1,
        playerCount: 2,
        gameCode: 'XYZ789',
      });

      expect(mockTrackGameStart).toHaveBeenCalledWith('multiplayer', {
        gameMode: 'blast',
        engineMode: 'multiplayer',
        isMultiplayer: true,
        roundIndex: 1,
        playerCount: 2,
        gameCode: 'XYZ789',
      });
    });

    it('should emit game_started with gameMode=word-hunt', () => {
      trackMpGameStart({
        gameMode: 'word-hunt',
        roundIndex: 0,
        playerCount: 4,
        gameCode: 'WH2026',
      });

      expect(mockTrackGameStart).toHaveBeenCalledWith('multiplayer', {
        gameMode: 'word-hunt',
        engineMode: 'multiplayer',
        isMultiplayer: true,
        roundIndex: 0,
        playerCount: 4,
        gameCode: 'WH2026',
      });
    });
  });

  describe('trackMpGameEnd', () => {
    it('should emit game_completed with all required properties', () => {
      trackMpGameEnd({
        gameMode: 'classic',
        roundIndex: 0,
        playerCount: 3,
        gameCode: 'ABC123',
        score: 250,
        wordCount: 12,
        durationSec: 120,
        isWinner: true,
      });

      expect(mockTrackGameEnd).toHaveBeenCalledWith('multiplayer', 250, 12, true, 120, {
        gameMode: 'classic',
        engineMode: 'multiplayer',
        isMultiplayer: true,
        roundIndex: 0,
        playerCount: 3,
        gameCode: 'ABC123',
        isWinner: true,
      });
    });

    it('should emit game_completed for blast mode', () => {
      trackMpGameEnd({
        gameMode: 'blast',
        roundIndex: 2,
        playerCount: 2,
        gameCode: 'BLAST01',
        score: 500,
        wordCount: 25,
        durationSec: 180,
        isWinner: false,
      });

      expect(mockTrackGameEnd).toHaveBeenCalledWith('multiplayer', 500, 25, true, 180, {
        gameMode: 'blast',
        engineMode: 'multiplayer',
        isMultiplayer: true,
        roundIndex: 2,
        playerCount: 2,
        gameCode: 'BLAST01',
        isWinner: false,
      });
    });

    it('should include roundIndex for session tracking', () => {
      trackMpGameEnd({
        gameMode: 'word-hunt',
        roundIndex: 3,
        playerCount: 4,
        gameCode: 'HUNT2026',
        score: 180,
        wordCount: 8,
        durationSec: 90,
        isWinner: true,
      });

      expect(mockTrackGameEnd).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          roundIndex: 3,
        })
      );
    });
  });
});
