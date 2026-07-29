import { describe, it, expect } from 'vitest';
import { stripMultiplayerExitParams, MULTIPLAYER_EXIT_TRAP_PARAMS } from '../stripExitParams';

describe('stripMultiplayerExitParams (UX audit 2026-05-04 #5)', () => {
  it('returns the original URL when no trap params are present', () => {
    const u = 'https://lexiclash.live/he/multiplayer';
    expect(stripMultiplayerExitParams(u)).toBe(u);
  });

  it('strips ?room=', () => {
    const out = stripMultiplayerExitParams('https://lexiclash.live/en/multiplayer?room=ABC123');
    expect(out).toBe('https://lexiclash.live/en/multiplayer');
  });

  it('strips ?classroom= and ?host=', () => {
    const out = stripMultiplayerExitParams(
      'https://lexiclash.live/en/multiplayer?classroom=true&host=true&room=ABC',
    );
    expect(out).toBe('https://lexiclash.live/en/multiplayer');
  });

  it('preserves unrelated query params (cg, mode, ref)', () => {
    const out = stripMultiplayerExitParams(
      'https://lexiclash.live/en/multiplayer?cg=1&mode=blast&room=ABC&ref=x',
    );
    const url = new URL(out);
    expect(url.searchParams.get('cg')).toBe('1');
    expect(url.searchParams.get('mode')).toBe('blast');
    expect(url.searchParams.get('ref')).toBe('x');
    expect(url.searchParams.has('room')).toBe(false);
  });

  it('preserves the hash fragment', () => {
    const out = stripMultiplayerExitParams(
      'https://lexiclash.live/en/multiplayer?room=ABC#scroll-here',
    );
    expect(out).toBe('https://lexiclash.live/en/multiplayer#scroll-here');
  });

  it('exports the canonical trap-param list', () => {
    expect(MULTIPLAYER_EXIT_TRAP_PARAMS).toEqual(
      expect.arrayContaining(['room', 'classroom', 'host']),
    );
  });
});
