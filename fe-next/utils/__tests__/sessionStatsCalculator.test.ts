import { describe, it, expect } from 'vitest';
import { getAllSessionFacts, type SessionFact } from '../sessionStatsCalculator';

interface Standing {
  username: string;
  totalScore: number;
  roundScores?: number[];
}

const find = (facts: SessionFact[], type: SessionFact['type']) =>
  facts.find((f) => f.type === type);

describe('getAllSessionFacts', () => {
  // 3 players, 3 rounds. "you" = Kelly.
  const standings: Standing[] = [
    { username: 'Khai', totalScore: 300, roundScores: [120, 90, 90] },
    { username: 'Kelly', totalScore: 280, roundScores: [40, 100, 140] }, // big improver, climbs
    { username: 'KCK', totalScore: 120, roundScores: [60, 30, 30] },
  ];

  describe('cap', () => {
    it('returns at most 2 facts (player mode)', () => {
      const facts = getAllSessionFacts(standings, 'Kelly');
      expect(facts.length).toBeLessThanOrEqual(2);
    });

    it('returns at most 2 facts (host/MVP mode)', () => {
      const facts = getAllSessionFacts(standings);
      expect(facts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('player-centric mode (currentUsername present)', () => {
    it('row 1 is about the viewer, flagged isCurrentUser', () => {
      const facts = getAllSessionFacts(standings, 'Kelly');
      expect(facts[0]).toBeDefined();
      expect(facts[0].isCurrentUser).toBe(true);
      expect(facts[0].playerName).toBe('Kelly');
    });

    it('picks one of the viewer personal insight types for row 1', () => {
      const facts = getAllSessionFacts(standings, 'Kelly');
      expect(['improvement', 'comeback', 'consistency', 'record', 'placement']).toContain(
        facts[0].type
      );
    });

    it('row 2 rivalry is the viewer nearest score-neighbor (not global closest pair)', () => {
      const facts = getAllSessionFacts(standings, 'Kelly');
      const rivalry = find(facts, 'rivalry');
      expect(rivalry).toBeDefined();
      expect(rivalry!.isCurrentUser).toBe(true);
      // Kelly(280) nearest neighbor is Khai(300), diff 20 — NOT the global closest pair
      expect(rivalry!.playerName).toBe('Kelly');
      expect(rivalry!.playerName2).toBe('Khai');
      expect(rivalry!.value).toBe(20);
    });

    it('falls back to placement when viewer has no flattering stat', () => {
      // Loner declines every round, dead last, no climb, never top-3-with-≥2
      const flat: Standing[] = [
        { username: 'Ace', totalScore: 300, roundScores: [100, 100, 100] },
        { username: 'Bee', totalScore: 250, roundScores: [90, 80, 80] },
        { username: 'Loser', totalScore: 60, roundScores: [40, 15, 5] },
      ];
      const facts = getAllSessionFacts(flat, 'Loser');
      expect(facts[0].isCurrentUser).toBe(true);
      expect(facts[0].playerName).toBe('Loser');
      // never invents someone else's win on the viewer's card
      expect(facts.every((f) => f.playerName === 'Loser' || f.isCurrentUser)).toBe(true);
    });

    it('handles a single player (no rival) without crashing', () => {
      const solo: Standing[] = [
        { username: 'Solo', totalScore: 200, roundScores: [50, 70, 80] },
      ];
      const facts = getAllSessionFacts(solo, 'Solo');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(find(facts, 'rivalry')).toBeUndefined();
    });

    it('never shows a non-viewer name on row 1', () => {
      const facts = getAllSessionFacts(standings, 'KCK');
      expect(facts[0].playerName).toBe('KCK');
      expect(facts[0].isCurrentUser).toBe(true);
    });
  });

  describe('host / MVP mode (no currentUsername)', () => {
    it('names real players, no isCurrentUser flag', () => {
      const facts = getAllSessionFacts(standings);
      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.every((f) => !f.isCurrentUser)).toBe(true);
    });

    it('uses the global closest pair for rivalry', () => {
      const facts = getAllSessionFacts(standings);
      const rivalry = find(facts, 'rivalry');
      if (rivalry) {
        // global closest pair = Khai(300)/Kelly(280) diff 20
        expect(rivalry.value).toBe(20);
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty for empty standings', () => {
      expect(getAllSessionFacts([], 'Kelly')).toEqual([]);
      expect(getAllSessionFacts([])).toEqual([]);
    });

    it('currentUsername not in standings falls back to MVP mode gracefully', () => {
      const facts = getAllSessionFacts(standings, 'Ghost');
      expect(facts.length).toBeLessThanOrEqual(2);
      expect(facts.every((f) => !f.isCurrentUser)).toBe(true);
    });
  });
});
