/**
 * Expectedness must be decided by the socket error CODE, not by the message.
 *
 * Regression: `useMultiplayerSocket` localizes a typed socket error before
 * reporting it — `GAME_NOT_IN_PROGRESS` becomes t('errors.gameNotInProgress')
 * ("Game hasn't started yet" in EN, and something else entirely in HE/JA/SV/ES).
 * `isExpectedError` only had an English regex (/not in progress/i), so the
 * localized text stopped matching and a routine, already-recovered desync was
 * reported to Sentry as an unexpected error (44 events / 4 days), permanently
 * unmatchable for non-English players.
 */
import { describe, it, expect } from 'vitest';
import { isExpectedError, isExpectedSocketErrorCode } from '../sentry';

describe('isExpectedSocketErrorCode', () => {
  it('treats routine game-state codes as expected', () => {
    for (const code of [
      'GAME_NOT_FOUND',
      'NOT_IN_GAME',
      'PLAYER_NOT_IN_GAME',
      'ROOM_NOT_FOUND',
      'GAME_NOT_IN_PROGRESS',
      'GAME_ALREADY_IN_PROGRESS',
      'GAME_ALREADY_STARTED',
      'AUTH_REQUIRED',
    ]) {
      expect(isExpectedSocketErrorCode(code)).toBe(true);
    }
  });

  it('does not swallow unknown codes', () => {
    expect(isExpectedSocketErrorCode('WORD_PROCESSING_ERROR')).toBe(false);
    expect(isExpectedSocketErrorCode(undefined)).toBe(false);
    expect(isExpectedSocketErrorCode('')).toBe(false);
  });
});

describe('isExpectedError — code beats localized message', () => {
  it.each([
    ["Game hasn't started yet", 'en'],
    ['המשחק עוד לא התחיל', 'he'],
    ['ゲームはまだ始まっていません', 'ja'],
    ['Spelet har inte börjat än', 'sv'],
    ['El juego aún no ha comenzado', 'es'],
  ])('classifies the %s (%s) wording as expected when the code is known', (message) => {
    expect(isExpectedError(new Error(message), 'GAME_NOT_IN_PROGRESS')).toBe(true);
  });

  it('still reports a genuine error that happens to carry no known code', () => {
    expect(isExpectedError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('keeps the existing message-based matching for untyped errors', () => {
    expect(isExpectedError(new Error('Game is not in progress'))).toBe(true);
  });
});
