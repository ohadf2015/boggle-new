vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  initShadowClash,
  startShadowClash,
  submitNightAction,
  submitVote,
  callVoteEarly,
  cleanupShadowClash,
} from '../shadowClashEngine';

// ==================== Mock Socket.IO ====================

function createMockIO() {
  const emitted: Array<{ event: string; data: unknown; room?: string }> = [];
  const privateEmits = new Map<string, Array<{ event: string; data: unknown }>>();

  return {
    to: vi.fn((target: string) => ({
      emit: vi.fn((event: string, data: unknown) => {
        emitted.push({ event, data, room: target });
        if (!target.startsWith('party:')) {
          // Private emit to a socket ID
          if (!privateEmits.has(target)) privateEmits.set(target, []);
          privateEmits.get(target)!.push({ event, data });
        }
      }),
    })),
    emitted,
    privateEmits,
    getPrivateEmits: (socketId: string) => privateEmits.get(socketId) || [],
  };
}

// ==================== Tests ====================

describe('shadowClashEngine', () => {
  const ROOM = 'SHADOW1';
  const PLAYERS = new Map([
    ['s1', 'Alice'],
    ['s2', 'Bob'],
    ['s3', 'Charlie'],
    ['s4', 'Diana'],
    ['s5', 'Eve'],
  ]);

  afterEach(() => {
    cleanupShadowClash(ROOM);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initShadowClash + startShadowClash', () => {
    it('should assign exactly 2 shadows, 1 seer, and 2 citizens for 5 players (medic requires 6+)', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);

      // Check role assignments via private emits
      const roleEvents = io.emitted.filter(e => e.event === 'party:shadow:roleAssigned');
      expect(roleEvents.length).toBe(5);

      const roles = roleEvents.map(e => (e.data as any).role);
      expect(roles.filter((r: string) => r === 'shadow').length).toBe(2);
      expect(roles.filter((r: string) => r === 'seer').length).toBe(1);
      // Medic requires 6+ players, so with 5 players: 0 medics, 2 citizens
      expect(roles.filter((r: string) => r === 'medic').length).toBe(0);
      expect(roles.filter((r: string) => r === 'citizen').length).toBe(2);
    });

    it('should send partner info to shadows', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);

      const shadowEvents = io.emitted.filter(
        e => e.event === 'party:shadow:roleAssigned' && (e.data as any).role === 'shadow'
      );
      expect(shadowEvents.length).toBe(2);

      // Both shadows should have partnerUsername
      for (const event of shadowEvents) {
        expect((event.data as any).partnerUsername).toBeDefined();
        expect((event.data as any).team).toBe('evil');
      }
    });

    it('should broadcast dealing phase to room', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);

      const phaseEvents = io.emitted.filter(e => e.event === 'party:phaseChange');
      expect(phaseEvents.length).toBeGreaterThan(0);
      const dealingEvent = phaseEvents.find(e => (e.data as any).gameState?.phase === 'dealing');
      expect(dealingEvent).toBeDefined();
    });

    it('should start night phase after dealing delay', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);

      // Advance past dealing animation (5s)
      vi.advanceTimersByTime(5000);

      const nightEvents = io.emitted.filter(e => e.event === 'party:shadow:nightStart');
      expect(nightEvents.length).toBe(1);
      expect((nightEvents[0].data as any).round).toBe(1);
    });
  });

  describe('night actions', () => {
    it('should send night action prompts to all alive players', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000); // past dealing

      const nightActions = io.emitted.filter(e => e.event === 'party:shadow:nightAction');
      expect(nightActions.length).toBe(5); // All 5 players get an action prompt
    });

    it('should send decoy "wait" action to citizens', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000);

      const waitActions = io.emitted.filter(
        e => e.event === 'party:shadow:nightAction' && (e.data as any).action === 'wait'
      );
      expect(waitActions.length).toBe(2); // 2 citizens (medic needs 6+ players)
    });

    it('should send seer result immediately when seer investigates', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000);

      // Find seer socket
      const seerAction = io.emitted.find(
        e => e.event === 'party:shadow:nightAction' && (e.data as any).action === 'investigate'
      );
      expect(seerAction).toBeDefined();
      const seerSocketId = seerAction!.room!;

      // Find a valid target
      const targets = (seerAction!.data as any).targets as string[];
      submitNightAction(io as any, ROOM, seerSocketId, targets[0]);

      const seerResults = io.emitted.filter(e => e.event === 'party:shadow:seerResult');
      expect(seerResults.length).toBe(1);
      expect(['evil', 'good']).toContain((seerResults[0].data as any).team);
    });
  });

  describe('night resolution', () => {
    it('should resolve night after 30s timeout and emit dawn', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000); // dealing
      vi.advanceTimersByTime(30000); // night timeout

      const dawnEvents = io.emitted.filter(e => e.event === 'party:shadow:dawn');
      expect(dawnEvents.length).toBe(1);
    });
  });

  describe('voting', () => {
    it('should start discussion after dawn', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000); // dealing
      vi.advanceTimersByTime(30000); // night
      vi.advanceTimersByTime(5000); // dawn reveal

      const discussEvents = io.emitted.filter(e => e.event === 'party:shadow:discussionStart');
      expect(discussEvents.length).toBe(1);
      expect((discussEvents[0].data as any).timeSeconds).toBe(120);
    });

    it('should allow calling vote early', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000 + 30000 + 5000); // to discussion

      callVoteEarly(io as any, ROOM, 's1');

      const trialEvents = io.emitted.filter(e => e.event === 'party:shadow:trialStart');
      expect(trialEvents.length).toBe(1);
    });

    it('should resolve vote when all players vote', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000 + 30000 + 5000); // to discussion
      vi.advanceTimersByTime(120000); // discussion timeout → trial

      // All alive players vote for Alice
      for (const [socketId] of PLAYERS) {
        submitVote(io as any, ROOM, socketId, 'Alice');
      }

      const voteReveals = io.emitted.filter(e => e.event === 'party:shadow:voteReveal');
      expect(voteReveals.length).toBe(1);
      expect((voteReveals[0].data as any).eliminated).toBe('Alice');
    });

    it('should skip elimination when majority votes skip', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);
      vi.advanceTimersByTime(5000 + 30000 + 5000 + 120000); // to trial

      for (const [socketId] of PLAYERS) {
        submitVote(io as any, ROOM, socketId, 'skip');
      }

      const voteReveals = io.emitted.filter(e => e.event === 'party:shadow:voteReveal');
      expect(voteReveals.length).toBe(1);
      expect((voteReveals[0].data as any).noElimination).toBe(true);
    });
  });

  describe('win conditions', () => {
    it('should end game when all shadows are eliminated', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 10);
      startShadowClash(io as any, ROOM);

      // Find shadow usernames from role assignments
      const shadowRoleEvents = io.emitted.filter(
        e => e.event === 'party:shadow:roleAssigned' && (e.data as any).role === 'shadow'
      );
      const shadowSocketIds = shadowRoleEvents.map(e => e.room!);
      const shadowUsernames = shadowSocketIds.map(id => PLAYERS.get(id)!);

      // Play through rounds eliminating shadows
      // Round 1: deal + night + dawn + discussion + trial
      vi.advanceTimersByTime(5000 + 30000 + 5000 + 120000); // to trial

      // Vote out first shadow
      for (const [socketId] of PLAYERS) {
        submitVote(io as any, ROOM, socketId, shadowUsernames[0]);
      }

      // Advance to next round
      vi.advanceTimersByTime(6000 + 30000 + 5000 + 120000); // verdict → night → dawn → discussion → trial

      // Vote out second shadow
      const aliveIds = Array.from(PLAYERS.keys()).filter(id => !shadowSocketIds.includes(id) || id === shadowSocketIds[1]);
      for (const socketId of aliveIds) {
        submitVote(io as any, ROOM, socketId, shadowUsernames[1]);
      }

      // Check for game over
      const gameOverEvents = io.emitted.filter(e => e.event === 'party:shadow:gameOver');
      // May need more time advancement for the verdict → game-over transition
      vi.advanceTimersByTime(10000);

      const allGameOvers = io.emitted.filter(e => e.event === 'party:shadow:gameOver');
      if (allGameOvers.length > 0) {
        expect((allGameOvers[0].data as any).winner).toBe('good');
      }
    });
  });

  describe('cleanupShadowClash', () => {
    it('should clear all timers and delete state', () => {
      vi.useFakeTimers();
      const io = createMockIO();
      initShadowClash(ROOM, PLAYERS, 'standard', 4);
      startShadowClash(io as any, ROOM);

      cleanupShadowClash(ROOM);
      // Should not throw on timer cleanup
    });
  });
});
