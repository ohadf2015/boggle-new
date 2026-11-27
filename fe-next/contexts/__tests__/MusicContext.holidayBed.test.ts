import { resolveTrackSrc, isSameResolvedTrack } from '../MusicContext';

describe('resolveTrackSrc: holiday beds', () => {
  it.each(['bossa', 'lobby', 'results'] as const)('given hanukkah, when %s resolves, then the hanukkah bed plays', (key) => {
    expect(resolveTrackSrc(key, 'default', 'hanukkah')).toBe('/audio/holidays/hanukkah.mp3');
  });

  it('given christmas and a styled profile, when the home bed resolves, then the holiday bed wins over the style', () => {
    expect(resolveTrackSrc('bossa', 'rock', 'christmas')).toBe('/audio/holidays/christmas.mp3');
  });

  it.each(['inGame', 'almostOutOfTime', 'beforeGame', 'daily', 'blast'] as const)(
    'given a holiday, when gameplay bed %s resolves, then it stays universal',
    (key) => {
      expect(resolveTrackSrc(key, 'default', 'hanukkah')).toBe(resolveTrackSrc(key, 'default'));
    },
  );

  it('given no holiday, when the home bed resolves, then nothing changes', () => {
    expect(resolveTrackSrc('bossa', 'default', null)).toBe(resolveTrackSrc('bossa', 'default'));
  });

  it('given a holiday, when moving from home to lobby, then the same file keeps rolling', () => {
    expect(isSameResolvedTrack('bossa', 'lobby', 'default', 'christmas')).toBe(true);
  });
});
