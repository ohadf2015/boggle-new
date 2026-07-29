vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  initCaptionClash,
  startCaptionRound,
  submitCaption,
  submitLaugh,
  submitVote,
  cleanupCaptionClash,
  getCaptionGameState,
} from '../captionClashEngine';

// ==================== Mock Socket.IO ====================

function createMockIO() {
  const emitted: Array<{ event: string; data: unknown; room?: string }> = [];
  const toRooms = new Map<string, typeof emitted>();

  return {
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, data: unknown) => {
        emitted.push({ event, data, room });
        if (!toRooms.has(room)) toRooms.set(room, []);
        toRooms.get(room)!.push({ event, data, room });
      }),
    })),
    emitted,
    toRooms,
    getEmittedTo: (room: string) => toRooms.get(room) || [],
  };
}

// ==================== Tests ====================

describe('captionClashEngine', () => {
  const ROOM = 'TEST1';
  const PLAYERS = new Map([
    ['socket1', 'Alice'],
    ['socket2', 'Bob'],
    ['socket3', 'Charlie'],
  ]);

  afterEach(() => {
    cleanupCaptionClash(ROOM);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initCaptionClash', () => {
    it('should initialize game state with correct player count and rounds', () => {
      initCaptionClash(ROOM, PLAYERS, 5);
      const state = getCaptionGameState(ROOM);

      expect(state).toBeDefined();
      expect(state!.totalRounds).toBe(5);
      expect(state!.currentRound).toBe(0);
      expect(state!.scores.size).toBe(3);
      expect(state!.playerUsernames.size).toBe(3);
    });

    it('should initialize all scores to 0', () => {
      initCaptionClash(ROOM, PLAYERS, 3);
      const state = getCaptionGameState(ROOM);

      for (const score of state!.scores.values()) {
        expect(score).toBe(0);
      }
    });
  });

  describe('startCaptionRound', () => {
    it('should increment round and emit imageReady', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 5);

      startCaptionRound(io as any, ROOM);

      const state = getCaptionGameState(ROOM);
      expect(state!.currentRound).toBe(1);

      const imageEvents = io.emitted.filter(e => e.event === 'party:caption:imageReady');
      expect(imageEvents.length).toBe(1);
      expect((imageEvents[0].data as any).round).toBe(1);
      expect((imageEvents[0].data as any).writeTimeSeconds).toBe(45);
    });

    it('should mark last-1 round as speed round (15s)', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);

      // Advance to round 2 (totalRounds - 1 = 2)
      startCaptionRound(io as any, ROOM);
      cleanupCaptionClash(ROOM);
      initCaptionClash(ROOM, PLAYERS, 3);

      // Manually set currentRound to simulate
      const state = getCaptionGameState(ROOM);
      (state as any).currentRound = 1; // Will become 2 on next start

      startCaptionRound(io as any, ROOM);

      const imageEvents = io.emitted.filter(e => e.event === 'party:caption:imageReady');
      const lastEvent = imageEvents[imageEvents.length - 1];
      expect((lastEvent.data as any).isSpeedRound).toBe(true);
      expect((lastEvent.data as any).writeTimeSeconds).toBe(15);
    });
  });

  describe('submitCaption', () => {
    it('should store submission and broadcast count', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);
      startCaptionRound(io as any, ROOM);

      submitCaption(io as any, ROOM, 'socket1', 'This is hilarious');

      const countEvents = io.emitted.filter(e => e.event === 'party:caption:submissionCount');
      expect(countEvents.length).toBeGreaterThan(0);
      const lastCount = countEvents[countEvents.length - 1].data as any;
      expect(lastCount.count).toBe(1);
      expect(lastCount.total).toBe(3);
    });

    it('should broadcast word cloud on submission', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);
      startCaptionRound(io as any, ROOM);

      submitCaption(io as any, ROOM, 'socket1', 'funny cat picture');

      const cloudEvents = io.emitted.filter(e => e.event === 'party:caption:wordCloud');
      expect(cloudEvents.length).toBeGreaterThan(0);
    });

    it('should truncate captions to 200 chars', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);
      startCaptionRound(io as any, ROOM);

      const longText = 'a'.repeat(300);
      submitCaption(io as any, ROOM, 'socket1', longText);

      const state = getCaptionGameState(ROOM);
      const round = state!.rounds[0];
      const submission = Array.from(round.submissions.values())[0];
      expect(submission.text.length).toBeLessThanOrEqual(200);
    });

    it('should auto-advance when all players submit', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);
      startCaptionRound(io as any, ROOM);

      submitCaption(io as any, ROOM, 'socket1', 'Caption 1');
      submitCaption(io as any, ROOM, 'socket2', 'Caption 2');
      submitCaption(io as any, ROOM, 'socket3', 'Caption 3');

      // Should have advanced to lineup — check for revealCaption events
      const revealEvents = io.emitted.filter(e => e.event === 'party:caption:revealCaption');
      // Reveals are delayed via setTimeout, advance timers
      vi.advanceTimersByTime(20000);
      const revealEventsAfter = io.emitted.filter(e => e.event === 'party:caption:revealCaption');
      expect(revealEventsAfter.length).toBeGreaterThan(0);
    });
  });

  describe('submitLaugh', () => {
    it('should increment laugh count and broadcast', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initCaptionClash(ROOM, PLAYERS, 3);
      startCaptionRound(io as any, ROOM);

      // Submit captions and advance to lineup
      submitCaption(io as any, ROOM, 'socket1', 'Caption 1');
      submitCaption(io as any, ROOM, 'socket2', 'Caption 2');
      submitCaption(io as any, ROOM, 'socket3', 'Caption 3');
      vi.advanceTimersByTime(5000); // advance to lineup

      // Get a submission ID
      const state = getCaptionGameState(ROOM);
      const subId = Array.from(state!.rounds[0].submissions.keys())[0];

      submitLaugh(ROOM, subId, io as any);
      submitLaugh(ROOM, subId, io as any);

      const laughEvents = io.emitted.filter(e => e.event === 'party:caption:laughUpdate');
      expect(laughEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cleanupCaptionClash', () => {
    it('should remove game state', () => {
      initCaptionClash(ROOM, PLAYERS, 3);
      expect(getCaptionGameState(ROOM)).toBeDefined();

      cleanupCaptionClash(ROOM);
      expect(getCaptionGameState(ROOM)).toBeUndefined();
    });
  });
});
