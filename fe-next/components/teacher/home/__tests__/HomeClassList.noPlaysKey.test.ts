import { describe, it, expect } from 'vitest';
import { noPlaysKey } from '../HomeClassList';

const NOW = Date.parse('2026-11-18T12:00:00Z');

describe('noPlaysKey', () => {
  it('GIVEN a class made minutes ago WHEN it has no games THEN it reads as not played yet', () => {
    expect(noPlaysKey('2026-11-18T11:55:00Z', NOW)).toBe('eduShell.home.noGamesYet');
  });
  it('GIVEN a class older than the 30 day window WHEN it has no games THEN it reads as idle', () => {
    expect(noPlaysKey('2026-10-01T00:00:00Z', NOW)).toBe('eduShell.home.notPlayedRecently');
  });
  it('GIVEN no creation date WHEN it has no games THEN it keeps the idle line', () => {
    expect(noPlaysKey(undefined, NOW)).toBe('eduShell.home.notPlayedRecently');
  });
});
