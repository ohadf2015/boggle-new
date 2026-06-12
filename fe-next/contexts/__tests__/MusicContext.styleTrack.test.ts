import { describe, it, expect } from 'vitest';
import { resolveTrackSrc } from '../MusicContext';

describe('resolveTrackSrc — style-aware in-game music', () => {
  it('swaps the in-game theme to the chosen style track', () => {
    expect(resolveTrackSrc('inGame', 'rock')).toBe('/music/styles/rock.mp3');
    expect(resolveTrackSrc('inGame', 'jazz')).toBe('/music/styles/jazz.mp3');
  });

  it('keeps the original in-game theme for the default style', () => {
    expect(resolveTrackSrc('inGame', 'default')).toBe('/music/in_game.mp3');
  });

  it('keeps the original in-game theme for an unknown style', () => {
    expect(resolveTrackSrc('inGame', 'nonsense')).toBe('/music/in_game.mp3');
  });

  it('never swaps functional/lobby cues — only the in-game signature theme', () => {
    expect(resolveTrackSrc('lobby', 'rock')).toBe('/music/in_lobby.mp3');
    expect(resolveTrackSrc('beforeGame', 'rock')).toBe('/music/before_game.mp3');
    expect(resolveTrackSrc('almostOutOfTime', 'rock')).toBe('/music/almost_out_of_time.mp3');
    expect(resolveTrackSrc('bossa', 'rock')).toBe('/music/bossa.mp3');
  });
});
