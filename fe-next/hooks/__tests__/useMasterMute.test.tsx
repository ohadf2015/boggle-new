import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * useMasterMute — the single source of truth both on-screen audio controls
 * (the global in-game FAB and the lobby header button) share, so they cannot
 * drift. Delegates the click decision to resolveMasterMuteClick.
 */

const musicState = {
  isMuted: false,
  audioUnlocked: true,
  toggleMute: vi.fn(),
  unlockAudio: vi.fn(),
};
const sfxState = {
  sfxMuted: false,
  toggleSfxMute: vi.fn(),
};

vi.mock('@/contexts/MusicContext', () => ({ useMusic: () => musicState }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfxState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => f ?? k }),
}));

import { useMasterMute } from '../useMasterMute';

function reset() {
  musicState.isMuted = false;
  musicState.audioUnlocked = true;
  musicState.toggleMute.mockClear();
  musicState.unlockAudio.mockClear();
  sfxState.sfxMuted = false;
  sfxState.toggleSfxMute.mockClear();
}

describe('useMasterMute', () => {
  beforeEach(reset);

  it('reports allMuted only when both channels are silenced', () => {
    musicState.isMuted = true;
    sfxState.sfxMuted = true;
    const { result } = renderHook(() => useMasterMute());
    expect(result.current.allMuted).toBe(true);
    expect(result.current.label).toBe('Unmute');
    expect(result.current.title).toBe('Sound off');
  });

  it('is not allMuted when only one channel is silenced', () => {
    musicState.isMuted = true;
    const { result } = renderHook(() => useMasterMute());
    expect(result.current.allMuted).toBe(false);
    expect(result.current.label).toBe('Mute');
  });

  it('mutes both channels when both are audible', () => {
    const { result } = renderHook(() => useMasterMute());
    act(() => result.current.toggle());
    expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
    expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
  });

  it('unlocks audio without muting when locked', () => {
    musicState.audioUnlocked = false;
    const { result } = renderHook(() => useMasterMute());
    act(() => result.current.toggle());
    expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
    expect(musicState.toggleMute).not.toHaveBeenCalled();
    expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
  });
});
