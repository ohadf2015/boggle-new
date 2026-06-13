import { vi } from 'vitest';
/**
 * Live style-swap regression — the homepage bed must change track when the
 * player commits a new style WHILE it is already playing.
 *
 * The pure `resolveTrackSrc` is covered in MusicContext.styleTrack.test.ts;
 * this drives the real provider path that bug reports hit: bossa is playing on
 * the homepage, the user picks a style, the music should crossfade to the new
 * style file. A faithful per-howl mock (unload flips playing()→false) so the
 * test reflects real howler, not an over-permissive shared stub.
 */
import React, { useEffect } from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';

interface FakeHowl {
  src: string;
  played: boolean;
  _playing: boolean;
  _unloaded: boolean;
}
const created: FakeHowl[] = [];

function makeHowl(src: string) {
  const self: FakeHowl = { src, played: false, _playing: false, _unloaded: false };
  created.push(self);
  return {
    play: () => { self.played = true; self._playing = true; },
    pause: () => { self._playing = false; },
    stop: () => { self._playing = false; },
    fade: () => {},
    volume: (v?: number) => (v === undefined ? 0.5 : undefined),
    state: () => (self._unloaded ? 'unloaded' : 'loaded'),
    playing: () => self._playing && !self._unloaded,
    unload: () => { self._unloaded = true; self._playing = false; },
    seek: () => {},
    load: () => { self._unloaded = false; },
    once: () => {},
    on: () => {},
    off: () => {},
  };
}

vi.mock('howler', () => ({
  Howl: vi.fn((opts: { src: string[] }) => makeHowl(opts?.src?.[0] ?? '')),
  Howler: {
    get ctx() {
      return { get state() { return 'running'; }, resume: () => Promise.resolve(), suspend: () => {} };
    },
  },
}));

vi.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: vi.fn((src: string) => makeHowl(src)),
  preloadAudioOnDemand: vi.fn().mockResolvedValue(undefined),
  ensureHowl: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Controllable player style — capture the React setter so the test can commit a
// new style and force MusicProvider to re-render (mirrors PlayerStyleContext
// pushing a committed style down to the music tree).
let setStyleExternal: ((k: string) => void) | null = null;
vi.mock('@/contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => {
    const [styleKey, setStyleKey] = React.useState('default');
    setStyleExternal = setStyleKey;
    return { styleKey, enabled: true };
  },
}));

import { MusicProvider, useMusic } from '../MusicContext';

function Home() {
  const { playTrack, TRACKS } = useMusic();
  useEffect(() => { playTrack(TRACKS.BOSSA); }, [playTrack, TRACKS]);
  return <button data-testid="unlock">unlock</button>;
}

describe('MusicContext — live homepage style swap', () => {
  beforeEach(() => {
    created.length = 0;
    setStyleExternal = null;
    vi.clearAllMocks();
    Object.defineProperty(document, 'hasFocus', { writable: true, value: () => true });
    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
  });

  it('crossfades the playing bossa bed to the chosen style file on commit', async () => {
    render(
      <MusicProvider>
        <Home />
      </MusicProvider>,
    );

    // unlock audio (first gesture) → the queued bossa bed starts
    await act(async () => { fireEvent.click(screen.getByTestId('unlock')); });
    await waitFor(() => {
      expect(created.some((h) => h.src === '/music/bossa.mp3' && h.played)).toBe(true);
    });

    // commit a new style while bossa is playing
    await act(async () => { setStyleExternal?.('rock'); });

    // the bed must switch to the rock style file AND actually play it
    await waitFor(() => {
      const rock = created.find((h) => h.src === '/music/styles/rock.mp3');
      expect(rock, 'a howl for the rock style file was created').toBeTruthy();
      expect(rock!.played, 'the rock style bed actually started playing').toBe(true);
    });
    // and the old default bossa bed is no longer playing
    const oldBossa = created.find((h) => h.src === '/music/bossa.mp3');
    expect(oldBossa!._playing).toBe(false);
  });
});
