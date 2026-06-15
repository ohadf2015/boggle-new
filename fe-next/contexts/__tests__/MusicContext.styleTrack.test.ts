import { describe, it, expect } from 'vitest';
import { resolveTrackSrc, isSameResolvedTrack } from '../MusicContext';

describe('resolveTrackSrc — style-aware music beds', () => {
  // Only the homepage / results bed (bossa) follows the player's chosen style.
  it('swaps ONLY the bossa bed to the chosen style track', () => {
    expect(resolveTrackSrc('bossa', 'rock')).toBe('/music/styles/rock.mp3');
    expect(resolveTrackSrc('bossa', 'jazz')).toBe('/music/styles/jazz.mp3');
  });

  it('keeps lobby / countdown / in-game on their universal beds even when styled', () => {
    expect(resolveTrackSrc('inGame', 'rock')).toBe('/music/in_game.mp3');
    expect(resolveTrackSrc('lobby', 'rock')).toBe('/music/in_lobby.mp3');
    expect(resolveTrackSrc('beforeGame', 'rock')).toBe('/music/before_game.mp3');
  });

  it('keeps the original bed for the default style', () => {
    expect(resolveTrackSrc('inGame', 'default')).toBe('/music/in_game.mp3');
    expect(resolveTrackSrc('lobby', 'default')).toBe('/music/in_lobby.mp3');
    expect(resolveTrackSrc('beforeGame', 'default')).toBe('/music/before_game.mp3');
    expect(resolveTrackSrc('bossa', 'default')).toBe('/music/bossa.mp3');
  });

  it('keeps the bossa bed original for an unknown style', () => {
    expect(resolveTrackSrc('bossa', 'nonsense')).toBe('/music/bossa.mp3');
  });

  it('never swaps functional stings — urgent ramp, earthquake, blast identity', () => {
    expect(resolveTrackSrc('almostOutOfTime', 'rock')).toBe('/music/almost_out_of_time.mp3');
    expect(resolveTrackSrc('bossaArcade', 'rock')).toBe('/music/bossa-arcade.mp3');
    expect(resolveTrackSrc('blast', 'rock')).toBe('/music/blast_mode.mp3');
  });
});

describe('isSameResolvedTrack — never restart the identical file across bed switches', () => {
  // Guards the "styled music restarts on every page" regression: a bed switch
  // that lands on the SAME resolved file must keep the current Howl rolling
  // instead of restarting from zero. The contract compares resolved src, so it
  // stays correct no matter how many beds are style-swappable.
  it('is true for the identical key (same file)', () => {
    expect(isSameResolvedTrack('bossa', 'bossa', 'rock')).toBe(true);
    expect(isSameResolvedTrack('inGame', 'inGame', 'default')).toBe(true);
  });

  it('is false when two beds resolve to different files', () => {
    // bossa -> rock.mp3, in-game stays universal -> different files
    expect(isSameResolvedTrack('bossa', 'inGame', 'rock')).toBe(false);
    expect(isSameResolvedTrack('bossa', 'lobby', 'default')).toBe(false);
  });

  it('is false against a functional sting', () => {
    expect(isSameResolvedTrack('bossa', 'almostOutOfTime', 'rock')).toBe(false);
    expect(isSameResolvedTrack('inGame', 'blast', 'rock')).toBe(false);
  });

  it('is false when there is no current track', () => {
    expect(isSameResolvedTrack(null, 'lobby', 'rock')).toBe(false);
  });
});
