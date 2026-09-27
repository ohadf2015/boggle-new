import { describe, it, expect } from 'vitest';
import { tvJoinAddress } from './tvJoinAddress';

/**
 * The projector bar told students to go to a page that cannot accept a code.
 *
 * INCIDENT (2026-08-30): TvJoinBar rendered the hardcoded literal
 * "lexiclash.live" under "JOIN AT", while the working join URL was computed
 * right above it and used only for the QR. Measured on production: that bare
 * domain has NO game-code input — zero matches for "game code / join code /
 * enter code / game pin" across the whole page — and neither does
 * /en/multiplayer. A student who cannot scan the QR had nowhere to type it.
 */
describe('tvJoinAddress', () => {
  it('shows a typeable address that carries the code', () => {
    expect(tvJoinAddress('https://www.lexiclash.live', 'en', 'H5XFU3')).toBe(
      'lexiclash.live/en/join/H5XFU3'
    );
  });

  it('keeps the class locale so a Hebrew room is not bounced to English', () => {
    expect(tvJoinAddress('https://www.lexiclash.live', 'he', 'ABC123')).toBe(
      'lexiclash.live/he/join/ABC123'
    );
  });

  it('drops the protocol and the www so it reads on a projector', () => {
    expect(tvJoinAddress('http://www.example.com', 'en', 'XY7Z90')).toBe(
      'example.com/en/join/XY7Z90'
    );
  });

  it('falls back to the bare host when there is no code yet', () => {
    expect(tvJoinAddress('https://www.lexiclash.live', 'en', '')).toBe('lexiclash.live');
  });

  it('survives a localhost origin with a port', () => {
    expect(tvJoinAddress('http://localhost:3000', 'en', 'H5XFU3')).toBe(
      'localhost:3000/en/join/H5XFU3'
    );
  });

  it('does not throw on a malformed base url', () => {
    expect(tvJoinAddress('not a url', 'en', 'H5XFU3')).toBe('lexiclash.live');
  });
});
