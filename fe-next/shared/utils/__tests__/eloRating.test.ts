/**
 * ELO Rating System Tests
 *
 * Tests for the Glicko-2 inspired ELO rating calculation
 * used in ranked multiplayer games.
 */

import {
  calculateNewRatings,
  calculateMultiplayerRatings,
  getRankTier,
  DEFAULT_RATING,
  DEFAULT_RD,
  K_FACTOR,
  type PlayerRating,
} from '../eloRating';

describe('eloRating', () => {
  describe('constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RATING).toBe(1000);
      expect(DEFAULT_RD).toBe(350);
      expect(K_FACTOR).toBe(32);
    });
  });

  describe('calculateNewRatings', () => {
    // Given two players with equal ratings
    it('should increase winner rating and decrease loser rating for equal players', () => {
      const winner: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 0 };
      const loser: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 0 };

      const result = calculateNewRatings(winner, loser);

      expect(result.winner.rating).toBeGreaterThan(1000);
      expect(result.loser.rating).toBeLessThan(1000);
    });

    // Given equal ratings, winner should gain ~20 (K=40 for new player * 0.5 expected)
    it('should give symmetric rating changes for equal-rated players', () => {
      const winner: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 0 };
      const loser: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 0 };

      const result = calculateNewRatings(winner, loser);

      const winnerGain = result.winner.rating - 1000;
      const loserLoss = 1000 - result.loser.rating;
      // Both new players (K=40), so gain/loss should be equal
      expect(winnerGain).toBe(loserLoss);
    });

    // Given a higher-rated player beats a lower-rated player, gain should be small
    it('should give small gain when higher-rated beats lower-rated', () => {
      const winner: PlayerRating = { rating: 1500, rd: 100, gamesPlayed: 50 };
      const loser: PlayerRating = { rating: 1000, rd: 100, gamesPlayed: 50 };

      const result = calculateNewRatings(winner, loser);

      const gain = result.winner.rating - 1500;
      expect(gain).toBeLessThan(10); // Small gain for expected win
      expect(gain).toBeGreaterThan(0);
    });

    // Given a lower-rated player beats a higher-rated player, gain should be large
    it('should give large gain when lower-rated beats higher-rated (upset)', () => {
      const winner: PlayerRating = { rating: 1000, rd: 100, gamesPlayed: 50 };
      const loser: PlayerRating = { rating: 1500, rd: 100, gamesPlayed: 50 };

      const result = calculateNewRatings(winner, loser);

      const gain = result.winner.rating - 1000;
      expect(gain).toBeGreaterThan(20); // Big gain for upset
    });

    // Given new players (< 30 games), K factor should be 40 (provisional)
    it('should use higher K factor for new players (< 30 games)', () => {
      const newWinner: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 5 };
      const newLoser: PlayerRating = { rating: 1000, rd: 350, gamesPlayed: 5 };

      const vetWinner: PlayerRating = { rating: 1000, rd: 100, gamesPlayed: 50 };
      const vetLoser: PlayerRating = { rating: 1000, rd: 100, gamesPlayed: 50 };

      const newResult = calculateNewRatings(newWinner, newLoser);
      const vetResult = calculateNewRatings(vetWinner, vetLoser);

      const newGain = newResult.winner.rating - 1000;
      const vetGain = vetResult.winner.rating - 1000;

      // New player K=40, veteran K=32, so new player gains more
      expect(newGain).toBeGreaterThan(vetGain);
    });

    // Rating deviation should decrease after each game
    it('should reduce rating deviation after a game', () => {
      const winner: PlayerRating = { rating: 1000, rd: 200, gamesPlayed: 10 };
      const loser: PlayerRating = { rating: 1000, rd: 200, gamesPlayed: 10 };

      const result = calculateNewRatings(winner, loser);

      expect(result.winner.rd).toBeLessThan(200);
      expect(result.loser.rd).toBeLessThan(200);
    });

    // Rating deviation should not go below 50
    it('should enforce minimum rating deviation of 50', () => {
      const winner: PlayerRating = { rating: 1000, rd: 50, gamesPlayed: 100 };
      const loser: PlayerRating = { rating: 1000, rd: 50, gamesPlayed: 100 };

      const result = calculateNewRatings(winner, loser);

      expect(result.winner.rd).toBe(50);
      expect(result.loser.rd).toBe(50);
    });

    // Games played should increment
    it('should increment games played for both players', () => {
      const winner: PlayerRating = { rating: 1000, rd: 200, gamesPlayed: 10 };
      const loser: PlayerRating = { rating: 1000, rd: 200, gamesPlayed: 20 };

      const result = calculateNewRatings(winner, loser);

      expect(result.winner.gamesPlayed).toBe(11);
      expect(result.loser.gamesPlayed).toBe(21);
    });

    // Rating should never go below 0
    it('should not allow rating to go below 0', () => {
      const winner: PlayerRating = { rating: 500, rd: 100, gamesPlayed: 50 };
      const loser: PlayerRating = { rating: 1, rd: 100, gamesPlayed: 50 };

      const result = calculateNewRatings(winner, loser);

      expect(result.loser.rating).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMultiplayerRatings', () => {
    it('should handle 2-player game same as calculateNewRatings', () => {
      const players: Array<{ id: string; rating: PlayerRating; placement: number }> = [
        { id: 'winner', rating: { rating: 1000, rd: 200, gamesPlayed: 10 }, placement: 1 },
        { id: 'loser', rating: { rating: 1000, rd: 200, gamesPlayed: 10 }, placement: 2 },
      ];

      const result = calculateMultiplayerRatings(players);

      expect(result.get('winner')!.rating).toBeGreaterThan(1000);
      expect(result.get('loser')!.rating).toBeLessThan(1000);
    });

    it('should handle 4-player game with correct ordering', () => {
      const players: Array<{ id: string; rating: PlayerRating; placement: number }> = [
        { id: 'first', rating: { rating: 1000, rd: 200, gamesPlayed: 30 }, placement: 1 },
        { id: 'second', rating: { rating: 1000, rd: 200, gamesPlayed: 30 }, placement: 2 },
        { id: 'third', rating: { rating: 1000, rd: 200, gamesPlayed: 30 }, placement: 3 },
        { id: 'fourth', rating: { rating: 1000, rd: 200, gamesPlayed: 30 }, placement: 4 },
      ];

      const result = calculateMultiplayerRatings(players);

      // 1st place should gain the most
      expect(result.get('first')!.rating).toBeGreaterThan(result.get('second')!.rating);
      // 2nd should be above 3rd
      expect(result.get('second')!.rating).toBeGreaterThan(result.get('third')!.rating);
      // 3rd should be above 4th
      expect(result.get('third')!.rating).toBeGreaterThan(result.get('fourth')!.rating);
      // 4th should lose rating
      expect(result.get('fourth')!.rating).toBeLessThan(1000);
    });

    it('should return empty map for empty input', () => {
      const result = calculateMultiplayerRatings([]);
      expect(result.size).toBe(0);
    });

    it('should handle single player by returning unchanged rating', () => {
      const players = [
        { id: 'solo', rating: { rating: 1200, rd: 150, gamesPlayed: 20 }, placement: 1 },
      ];

      const result = calculateMultiplayerRatings(players);
      expect(result.get('solo')!.rating).toBe(1200);
    });

    it('should maintain strict monotonic ordering in 8-player game', () => {
      const baseRating: PlayerRating = { rating: 1000, rd: 200, gamesPlayed: 30 };
      const eightPlayers = Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        rating: { ...baseRating },
        placement: i + 1,
      }));

      const result = calculateMultiplayerRatings(eightPlayers);

      for (let i = 1; i < 8; i++) {
        expect(result.get(`p${i}`)!.rating).toBeGreaterThan(result.get(`p${i + 1}`)!.rating);
      }
    });

    it('should increment gamesPlayed for all players in multiplayer', () => {
      const players = [
        { id: 'a', rating: { rating: 1000, rd: 200, gamesPlayed: 5 }, placement: 1 },
        { id: 'b', rating: { rating: 1000, rd: 200, gamesPlayed: 10 }, placement: 2 },
        { id: 'c', rating: { rating: 1000, rd: 200, gamesPlayed: 15 }, placement: 3 },
      ];

      const result = calculateMultiplayerRatings(players);

      expect(result.get('a')!.gamesPlayed).toBe(6);
      expect(result.get('b')!.gamesPlayed).toBe(11);
      expect(result.get('c')!.gamesPlayed).toBe(16);
    });
  });

  describe('getRankTier', () => {
    it('should return Unranked for ratings below 800', () => {
      expect(getRankTier(0).name).toBe('Unranked');
      expect(getRankTier(500).name).toBe('Unranked');
      expect(getRankTier(799).name).toBe('Unranked');
    });

    it('should return Bronze for ratings 800-999', () => {
      expect(getRankTier(800).name).toBe('Bronze');
      expect(getRankTier(999).name).toBe('Bronze');
    });

    it('should return Silver for ratings 1000-1199', () => {
      expect(getRankTier(1000).name).toBe('Silver');
      expect(getRankTier(1199).name).toBe('Silver');
    });

    it('should return Gold for ratings 1200-1399', () => {
      expect(getRankTier(1200).name).toBe('Gold');
      expect(getRankTier(1399).name).toBe('Gold');
    });

    it('should return Platinum for ratings 1400-1599', () => {
      expect(getRankTier(1400).name).toBe('Platinum');
      expect(getRankTier(1599).name).toBe('Platinum');
    });

    it('should return Diamond for ratings 1600-1799', () => {
      expect(getRankTier(1600).name).toBe('Diamond');
      expect(getRankTier(1799).name).toBe('Diamond');
    });

    it('should return Master for ratings 1800-1999', () => {
      expect(getRankTier(1800).name).toBe('Master');
      expect(getRankTier(1999).name).toBe('Master');
    });

    it('should return Grandmaster for ratings >= 2000', () => {
      expect(getRankTier(2000).name).toBe('Grandmaster');
      expect(getRankTier(3000).name).toBe('Grandmaster');
    });

    it('should return correct colors for each tier', () => {
      expect(getRankTier(500).color).toBe('#666');
      expect(getRankTier(800).color).toBe('#CD7F32');
      expect(getRankTier(1000).color).toBe('#C0C0C0');
      expect(getRankTier(1200).color).toBe('#FFD700');
      expect(getRankTier(1400).color).toBe('#E5E4E2');
      expect(getRankTier(1600).color).toBe('#00FFFF');
      expect(getRankTier(1800).color).toBe('#8B5CF6');
      expect(getRankTier(2000).color).toBe('#FF1493');
    });

    it('should return correct minRating for each tier', () => {
      expect(getRankTier(500).minRating).toBe(0);
      expect(getRankTier(800).minRating).toBe(800);
      expect(getRankTier(1000).minRating).toBe(1000);
      expect(getRankTier(1200).minRating).toBe(1200);
      expect(getRankTier(1400).minRating).toBe(1400);
      expect(getRankTier(1600).minRating).toBe(1600);
      expect(getRankTier(1800).minRating).toBe(1800);
      expect(getRankTier(2000).minRating).toBe(2000);
    });
  });
});
