import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Behavior tests for MusicControls.
 *
 * Two regressions audited 2026-04-30 — mute "kept coming back":
 *  1. Sliding the volume slider above 0 while muted auto-unmuted the user.
 *     A slider drag should change the underlying volume; mute is a separate axis.
 *  2. The unified mute button called toggleMute + toggleSfxMute unconditionally.
 *     When music/sfx mute states had drifted apart, one click flipped them
 *     in opposite directions instead of putting them in a coherent state.
 *
 * Desired behavior:
 *  - Slider drag never toggles mute. Period.
 *  - Master button computes a single target: any audible → mute both;
 *    both muted → unmute both. Drift is corrected, not preserved.
 */

// Stub framer-motion to a passthrough so we don't need the real motion runtime.
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => (props: React.PropsWithChildren<Record<string, unknown>>) => {
      const { children, ...rest } = props;
      const safe: Record<string, unknown> = {};
      Object.keys(rest).forEach((k) => {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(k)) {
          safe[k] = (rest as Record<string, unknown>)[k];
        }
      });
      return React.createElement('div', safe, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

const musicState = {
  volume: 0.5,
  isMuted: false,
  isPlaying: false,
  audioUnlocked: true,
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  unlockAudio: vi.fn(),
};

const sfxState = {
  sfxVolume: 0.5,
  sfxMuted: false,
  setSfxVolume: vi.fn(),
  toggleSfxMute: vi.fn(),
};

vi.mock('../../contexts/MusicContext', () => ({
  useMusic: () => musicState,
}));

vi.mock('../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => sfxState,
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('../../contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ enabled: false, setEnabled: vi.fn() }),
}));

// Import AFTER mocks so the component closes over them.
import MusicControls from '../MusicControls';

function resetState() {
  musicState.volume = 0.5;
  musicState.isMuted = false;
  musicState.isPlaying = false;
  musicState.audioUnlocked = true;
  musicState.setVolume.mockClear();
  musicState.toggleMute.mockClear();
  musicState.unlockAudio.mockClear();
  sfxState.sfxVolume = 0.5;
  sfxState.sfxMuted = false;
  sfxState.setSfxVolume.mockClear();
  sfxState.toggleSfxMute.mockClear();
}

describe('MusicControls — mute behavior', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    cleanup();
  });

  // The dropdown (containing the sliders) is portal-rendered and only mounts
  // on hover/focus. Helper opens it before querying.
  function openDropdown(): void {
    const group = screen.getByRole('group', { name: 'music.controls' });
    fireEvent.mouseEnter(group);
  }

  describe('slider drag does not auto-unmute', () => {
    it('dragging music slider above 0 while muted leaves mute alone', () => {
      musicState.isMuted = true;

      render(<MusicControls />);
      openDropdown();

      const slider = screen.getByLabelText('music.musicVolumeSlider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.7' } });

      expect(musicState.setVolume).toHaveBeenCalledWith(0.7);
      expect(musicState.toggleMute).not.toHaveBeenCalled();
    });

    it('dragging sfx slider above 0 while sfxMuted leaves mute alone', () => {
      sfxState.sfxMuted = true;

      render(<MusicControls />);
      openDropdown();

      const slider = screen.getByLabelText('music.sfxVolumeSlider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.7' } });

      expect(sfxState.setSfxVolume).toHaveBeenCalledWith(0.7);
      expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
    });
  });

  describe('master mute button — coherent target state', () => {
    it('when both audible, click mutes both', () => {
      musicState.isMuted = false;
      sfxState.sfxMuted = false;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('when both muted, click unmutes both', () => {
      musicState.isMuted = true;
      sfxState.sfxMuted = true;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('when only music muted, click should make BOTH muted (silence wins) — never flip music back to audible', () => {
      musicState.isMuted = true;
      sfxState.sfxMuted = false;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      // Music was already muted — must NOT be toggled back to audible.
      expect(musicState.toggleMute).not.toHaveBeenCalled();
      // SFX was audible — must be muted to match.
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('when only sfx muted, click should make BOTH muted', () => {
      musicState.isMuted = false;
      sfxState.sfxMuted = true;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
    });

    // Locked-tab entry (web autoplay policy): the click must NOT be swallowed.
    // It moves TOWARD audible — unlock + unmute anything muted, mute nothing.
    // Native apps boot already-unlocked, so the old swallow only broke web.
    it('when audio locked and both audible, click only unlocks (no mute on enable)', () => {
      musicState.audioUnlocked = false;
      musicState.isMuted = false;
      sfxState.sfxMuted = false;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
      expect(musicState.toggleMute).not.toHaveBeenCalled();
      expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
    });

    it('when audio locked and both muted, click unlocks AND unmutes both (toward audible)', () => {
      musicState.audioUnlocked = false;
      musicState.isMuted = true;
      sfxState.sfxMuted = true;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('when audio locked and only music muted, click unlocks AND unmutes music', () => {
      musicState.audioUnlocked = false;
      musicState.isMuted = true;
      sfxState.sfxMuted = false;

      render(<MusicControls />);
      fireEvent.click(screen.getByRole('button', { name: /mute|unmute|sound/i }));

      expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
    });
  });
});
