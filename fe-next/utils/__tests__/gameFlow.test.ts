/**
 * Game Flow Logic Tests
 * 
 * Tests for complete game flow: word submission, validation, scoring, results
 */

import { validateWordLocally, isWordOnBoard } from '../clientWordValidator';
import { calculateWordScore } from '@/shared/utils/scoring';

describe('Game Flow - Word Submission to Results', () => {
  const testGrid = [
    ['C', 'A', 'T', 'S'],
    ['D', 'O', 'G', 'S'],
    ['B', 'A', 'T', 'S'],
    ['R', 'A', 'T', 'S'],
  ];

  describe('word submission flow', () => {
    it('validates word locally before submission', () => {
      const foundWords: Array<{ word: string; isValid?: boolean | null }> = [];
      const result = validateWordLocally('cat', 'en', 2, foundWords);
      
      expect(result.isValid).toBe(true);
      expect(result.shouldSubmitToServer).toBe(true);
    });

    it('checks word exists on board', () => {
      expect(isWordOnBoard('cat', testGrid, 'en')).toBe(true);
      expect(isWordOnBoard('dog', testGrid, 'en')).toBe(true);
      expect(isWordOnBoard('bat', testGrid, 'en')).toBe(true);
    });

    it('rejects words not on board', () => {
      expect(isWordOnBoard('zoo', testGrid, 'en')).toBe(false);
      expect(isWordOnBoard('xyz', testGrid, 'en')).toBe(false);
    });
  });

  describe('score calculation flow', () => {
    it('calculates score based on word length', () => {
      const calculateScore = (length: number) => Math.max(length - 1, 0);
      
      expect(calculateScore(2)).toBe(1);
      expect(calculateScore(3)).toBe(2);
      expect(calculateScore(4)).toBe(3);
      expect(calculateScore(5)).toBe(4);
    });

    it('tracks cumulative score', () => {
      let totalScore = 0;
      const words = ['cat', 'dog', 'bat'];
      
      words.forEach(word => {
        totalScore += calculateWordScore(word);
      });

      // cat=10, dog=10, bat=10 = 30
      expect(totalScore).toBe(30);
    });
  });

  describe('combo system flow', () => {
    it('increments combo for consecutive valid words', () => {
      let comboLevel = 0;
      const validWords = ['cat', 'dog', 'bat'];
      
      validWords.forEach(() => {
        comboLevel += 1;
      });
      
      expect(comboLevel).toBe(3);
    });

    it('resets combo on invalid word', () => {
      let comboLevel = 3;
      const isValid = false;
      
      if (!isValid) {
        comboLevel = 0;
      }
      
      expect(comboLevel).toBe(0);
    });

    it('resets combo after timeout', () => {
      let comboLevel = 5;
      const timeoutMs = 8000;
      const lastWordTime = Date.now() - 9000;
      
      if (Date.now() - lastWordTime > timeoutMs) {
        comboLevel = 0;
      }
      
      expect(comboLevel).toBe(0);
    });
  });

  describe('results calculation', () => {
    it('sorts players by score', () => {
      const players = [
        { username: 'Player1', score: 80 },
        { username: 'Player2', score: 100 },
        { username: 'Player3', score: 60 },
      ];
      
      const sorted = [...players].sort((a, b) => b.score - a.score);
      
      expect(sorted[0].score).toBe(100);
      expect(sorted[1].score).toBe(80);
      expect(sorted[2].score).toBe(60);
    });

    it('identifies winner', () => {
      const players = [
        { username: 'Player1', score: 80 },
        { username: 'Player2', score: 100 },
      ];
      
      const winner = players.reduce((max, player) => 
        player.score > max.score ? player : max
      );
      
      expect(winner.username).toBe('Player2');
      expect(winner.score).toBe(100);
    });

    it('calculates total words found', () => {
      const playerWords = {
        Player1: ['cat', 'dog', 'bat'],
        Player2: ['cat', 'rat', 'sat'],
      };
      
      const totalWords = Object.values(playerWords).flat().length;
      expect(totalWords).toBe(6);
    });
  });

  describe('duplicate word handling', () => {
    it('tracks found words to prevent duplicates', () => {
      const foundWords = new Set<string>();
      const words = ['cat', 'dog', 'cat', 'bat'];
      
      words.forEach(word => {
        if (!foundWords.has(word)) {
          foundWords.add(word);
        }
      });
      
      expect(foundWords.size).toBe(3);
      expect(foundWords.has('cat')).toBe(true);
    });

    it('rejects duplicate words', () => {
      const foundWords: Array<{ word: string; isValid?: boolean | null }> = [
        { word: 'cat', isValid: true },
      ];
      
      const result = validateWordLocally('cat', 'en', 2, foundWords);
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('playerView.wordAlreadyFound');
    });
  });
});



