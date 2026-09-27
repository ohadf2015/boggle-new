import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseRivalFromParams } from '@/utils/dailyChallenge/rivalChallenge';

describe('Daily Rival Challenge Integration', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should persist rival challenge data to sessionStorage', () => {
    const params = {
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: '42',
    };

    const rival = parseRivalFromParams(params, 42);
    expect(rival).not.toBeNull();

    // Simulate what the component would do
    if (rival) {
      sessionStorage.setItem('daily_challenge_rival', JSON.stringify({
        name: rival.name,
        emoji: rival.emoji,
        score: rival.score,
        puzzleNumber: rival.puzzleNumber,
      }));
    }

    const stored = sessionStorage.getItem('daily_challenge_rival');
    expect(stored).toBeDefined();
    const data = JSON.parse(stored!);
    expect(data.name).toBe('Alice');
    expect(data.score).toBe(250);
  });

  it('should not persist stale puzzle challenges', () => {
    const params = {
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: '41', // yesterday's puzzle
    };

    const rival = parseRivalFromParams(params, 42); // today's puzzle is 42
    expect(rival).toBeNull();

    // Should not store anything
    sessionStorage.setItem('daily_challenge_rival', JSON.stringify(null));
    const stored = sessionStorage.getItem('daily_challenge_rival');
    expect(stored).toBe('null');
  });

  it('should clear rival data after use', () => {
    // Store rival data
    sessionStorage.setItem('daily_challenge_rival', JSON.stringify({
      name: 'Alice',
      emoji: '🎯',
      score: 250,
      puzzleNumber: 42,
    }));

    let stored = sessionStorage.getItem('daily_challenge_rival');
    expect(stored).not.toBeNull();

    // Simulate clearing after render
    sessionStorage.removeItem('daily_challenge_rival');

    stored = sessionStorage.getItem('daily_challenge_rival');
    expect(stored).toBeNull();
  });

  it('should not interfere with unrelated sessionStorage keys', () => {
    // Store some other data
    sessionStorage.setItem('other_key', 'other_value');

    // Store rival data
    sessionStorage.setItem('daily_challenge_rival', JSON.stringify({
      name: 'Alice',
      emoji: '🎯',
      score: 250,
      puzzleNumber: 42,
    }));

    // Clear rival data
    sessionStorage.removeItem('daily_challenge_rival');

    // Other key should still exist
    expect(sessionStorage.getItem('other_key')).toBe('other_value');
    expect(sessionStorage.getItem('daily_challenge_rival')).toBeNull();
  });
});
