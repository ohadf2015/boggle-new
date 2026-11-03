import { resolveTrackSrc, isSameResolvedTrack } from '../MusicContext';

describe('resolveTrackSrc: daily and boss beds', () => {
  it.each([
    ['daily', '/music/daily-bed.mp3'],
    ['boss', '/music/boss-focus.mp3'],
  ] as const)('%s maps to its own file and ignores the chosen style', (key, file) => {
    expect(resolveTrackSrc(key, 'default')).toBe(file);
    expect(resolveTrackSrc(key, 'rock')).toBe(file);
  });
});

describe('results bed', () => {
  it('uses the results groove by default and the chosen style when there is one', () => {
    expect(resolveTrackSrc('results', 'default')).toBe('/music/results-groove.mp3');
    expect(resolveTrackSrc('results', 'rock')).toBe('/music/styles/rock.mp3');
  });

  it('does not restart a styled profile moving from the homepage bed to results', () => {
    expect(isSameResolvedTrack('bossa', 'results', 'rock')).toBe(true);
    expect(isSameResolvedTrack('bossa', 'results', 'default')).toBe(false);
  });
});

describe('mode beds', () => {
  it.each([
    ['wordTower', '/music/word-tower-bed.mp3'],
    ['connections', '/music/connections-bed.mp3'],
    ['crossword', '/music/crossword-bed.mp3'],
    ['adventure', '/music/adventure-bed.mp3'],
  ] as const)('%s has its own file and ignores the chosen style', (key, file) => {
    expect(resolveTrackSrc(key, 'default')).toBe(file);
    expect(resolveTrackSrc(key, 'rock')).toBe(file);
  });
});
