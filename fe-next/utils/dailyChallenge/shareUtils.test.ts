import { describe, it, expect } from 'vitest';
import { generateChallengeShareUrl } from './shareUtils';
import type { WordHuntResult } from './types';

describe('generateChallengeShareUrl', () => {
  const mockResult: WordHuntResult = {
    language: 'en',
    puzzleNumber: 42,
    solved: true,
    attemptsUsed: 5,
    score: 250,
    displayName: 'Alice',
    avatarEmoji: '🎯',
    timeSeconds: 120,
  };

  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://lexiclash.live',
      },
      writable: true,
    });
  });

  it('should generate URL with sender score for challenge', () => {
    const url = generateChallengeShareUrl(mockResult, mockResult.displayName, mockResult.avatarEmoji, mockResult.score);

    expect(url).toContain('whName=Alice');
    // Emoji gets URL-encoded
    expect(url).toContain('whEmoji=');
    expect(url).toContain('whScore=250');
    expect(url).toContain('whPuzzle=42');
    expect(url).toContain('/en/daily');

    // Verify decoded URL works
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('whEmoji=🎯');
  });

  it('should encode URL params correctly', () => {
    const result = { ...mockResult, displayName: 'Alice & Bob' };
    const url = generateChallengeShareUrl(result, result.displayName, result.avatarEmoji, result.score);

    // Should handle special characters
    expect(url).toContain('whName=');
    expect(url).toContain('/en/daily');
  });

  it('should include streak param if provided', () => {
    const url = generateChallengeShareUrl(mockResult, mockResult.displayName, mockResult.avatarEmoji, mockResult.score, 7);

    expect(url).toContain('whStreak=7');
  });

  it('should handle zero score', () => {
    const url = generateChallengeShareUrl(mockResult, mockResult.displayName, mockResult.avatarEmoji, 0);

    expect(url).toContain('whScore=0');
  });

  it('should respect siteUrl override', () => {
    const url = generateChallengeShareUrl(
      mockResult,
      mockResult.displayName,
      mockResult.avatarEmoji,
      mockResult.score,
      undefined,
      'https://example.com'
    );

    expect(url).toContain('https://example.com');
  });
});
