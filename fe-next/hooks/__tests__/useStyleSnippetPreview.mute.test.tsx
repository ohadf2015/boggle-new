/**
 * useStyleSnippetPreview — music-mute respect.
 *
 * When the player has muted music, previewing a style must NOT blast a snippet,
 * and must NOT perturb the music volume state by ducking. Muting music = silence,
 * including style previews.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const setVolume = vi.fn();
const musicState = { volume: 0.5, isMuted: false };

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ volume: musicState.volume, isMuted: musicState.isMuted, setVolume }),
}));

import { useStyleSnippetPreview } from '../useStyleSnippetPreview';

// Capture Audio instances the hook constructs.
class FakeAudio {
  static instances: FakeAudio[] = [];
  preload = '';
  src = '';
  volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor() {
    FakeAudio.instances.push(this);
  }
}

beforeEach(() => {
  setVolume.mockClear();
  FakeAudio.instances = [];
  musicState.volume = 0.5;
  musicState.isMuted = false;
  // @ts-expect-error test shim
  global.Audio = FakeAudio;
});

describe('useStyleSnippetPreview mute respect', () => {
  it('ducks music and plays a snippet when not muted', () => {
    const { result } = renderHook(() => useStyleSnippetPreview());
    act(() => result.current.playSnippet('/music/styles/rock.mp3'));

    expect(setVolume).toHaveBeenCalledWith(0); // ducked
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].play).toHaveBeenCalled();
  });

  it('does NOT play or duck when music is muted', () => {
    musicState.isMuted = true;
    const { result } = renderHook(() => useStyleSnippetPreview());
    act(() => result.current.playSnippet('/music/styles/rock.mp3'));

    expect(FakeAudio.instances).toHaveLength(0); // no snippet created
    expect(setVolume).not.toHaveBeenCalled(); // volume state untouched
  });
});
