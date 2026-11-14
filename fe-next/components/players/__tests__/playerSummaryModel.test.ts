import { describe, it, expect } from 'vitest';
import { hasSummary, playerProfileHref, summaryAccess } from '../playerSummaryModel';

const viewer = (isAuthenticated: boolean, canResolveBoardKey: boolean) => ({ isAuthenticated, canResolveBoardKey });

describe('summaryAccess', () => {
  it('uses the id when the board has one', () => {
    expect(summaryAccess({ id: 'u1' }, viewer(false, false))).toBe('id');
    expect(summaryAccess({ id: 'u1', boardKey: 'k' }, viewer(true, true))).toBe('id');
  });

  it('resolves a board key only for a signed-in viewer on a dated board', () => {
    expect(summaryAccess({ boardKey: 'k' }, viewer(true, true))).toBe('boardKey');
    expect(summaryAccess({ boardKey: 'k' }, viewer(true, false))).toBe('rowOnly');
  });

  it('asks a signed-out viewer to sign in for a board-key row', () => {
    expect(summaryAccess({ boardKey: 'k' }, viewer(false, false))).toBe('signIn');
  });

  it('treats rows with neither as guests', () => {
    expect(summaryAccess({}, viewer(true, true))).toBe('guest');
    expect(hasSummary({})).toBe(false);
    expect(hasSummary({ boardKey: 'k' })).toBe(true);
  });
});

describe('playerProfileHref', () => {
  it('builds the localized profile path with an encoded id', () => {
    expect(playerProfileHref('he', 'a b')).toBe('/he/player/a%20b');
    expect(playerProfileHref('', 'u1')).toBe('/en/player/u1');
  });
});
