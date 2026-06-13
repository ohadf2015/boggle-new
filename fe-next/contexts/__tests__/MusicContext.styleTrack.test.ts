import { describe, it, expect } from 'vitest';
import { resolveTrackSrc } from '../MusicContext';

describe('resolveTrackSrc — style-aware music beds', () => {
  // The ambient/menu/game BEDS follow the player's chosen style so the vibe is
  // pervasive: homepage (bossa), lobby, countdown (beforeGame) and in-game.
  it('swaps every musical bed to the chosen style track', () => {
    for (const key of ['inGame', 'lobby', 'beforeGame', 'bossa'] as const) {
      expect(resolveTrackSrc(key, 'rock')).toBe('/music/styles/rock.mp3');
      expect(resolveTrackSrc(key, 'jazz')).toBe('/music/styles/jazz.mp3');
    }
  });

  it('keeps the original bed for the default style', () => {
    expect(resolveTrackSrc('inGame', 'default')).toBe('/music/in_game.mp3');
    expect(resolveTrackSrc('lobby', 'default')).toBe('/music/in_lobby.mp3');
    expect(resolveTrackSrc('beforeGame', 'default')).toBe('/music/before_game.mp3');
    expect(resolveTrackSrc('bossa', 'default')).toBe('/music/bossa.mp3');
  });

  it('keeps the original bed for an unknown style', () => {
    expect(resolveTrackSrc('inGame', 'nonsense')).toBe('/music/in_game.mp3');
    expect(resolveTrackSrc('lobby', 'nonsense')).toBe('/music/in_lobby.mp3');
  });

  it('never swaps functional stings — urgent ramp, earthquake, blast identity', () => {
    expect(resolveTrackSrc('almostOutOfTime', 'rock')).toBe('/music/almost_out_of_time.mp3');
    expect(resolveTrackSrc('bossaArcade', 'rock')).toBe('/music/bossa-arcade.mp3');
    expect(resolveTrackSrc('blast', 'rock')).toBe('/music/blast_mode.mp3');
  });
});
