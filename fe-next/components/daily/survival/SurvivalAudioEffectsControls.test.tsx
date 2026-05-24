import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Behavior tests for the in-game audio + effects controls.
 *
 * Reviewer feedback (daily challenge): "couldn't find a mute button for the
 * music" and "way too many lights and bells and whistles". These controls live
 * in the in-game header (the only chrome visible during play) and give the
 * player a one-tap mute (music + SFX) and a one-tap effects toggle.
 *
 * Audio button mirrors the master mute behaviour from MusicControls:
 *   - any channel audible → mute both
 *   - both already muted   → unmute both
 *   - never flip a channel against the chosen direction (drift is corrected)
 *   - audio not unlocked    → unlock first, toggle nothing
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

let effectsReduced = false;
const toggleEffects = vi.fn(() => {
  effectsReduced = !effectsReduced;
});

vi.mock('@/contexts/MusicContext', () => ({ useMusic: () => musicState }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfxState }));
vi.mock('@/hooks/useReducedEffects', () => ({
  useReducedEffects: () => [effectsReduced, toggleEffects] as [boolean, () => void],
}));

// Import AFTER mocks so the component closes over them.
import { SurvivalAudioEffectsControls } from './SurvivalAudioEffectsControls';

const t = (key: string) => key;

function resetState() {
  musicState.isMuted = false;
  musicState.audioUnlocked = true;
  musicState.toggleMute.mockClear();
  musicState.unlockAudio.mockClear();
  sfxState.sfxMuted = false;
  sfxState.toggleSfxMute.mockClear();
  effectsReduced = false;
  toggleEffects.mockClear();
}

const audioButton = () => screen.getByRole('button', { name: /mute|unmute/i });
const effectsButton = () => screen.getByRole('button', { name: /disableAnimations|effects\.enable/i });

describe('SurvivalAudioEffectsControls', () => {
  beforeEach(resetState);
  afterEach(cleanup);

  describe('audio mute button (music + SFX together)', () => {
    it('mutes both music and SFX when both are audible', () => {
      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(audioButton());

      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('unmutes both when both are muted', () => {
      musicState.isMuted = true;
      sfxState.sfxMuted = true;

      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(audioButton());

      expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('corrects drift: only music muted → mutes SFX, leaves music muted', () => {
      musicState.isMuted = true;
      sfxState.sfxMuted = false;

      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(audioButton());

      expect(musicState.toggleMute).not.toHaveBeenCalled();
      expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
    });

    it('unlocks audio first (and toggles nothing) when audio is not unlocked', () => {
      musicState.audioUnlocked = false;

      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(audioButton());

      expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
      expect(musicState.toggleMute).not.toHaveBeenCalled();
      expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
    });

    it('shows a distinct muted label/icon when both channels are muted', () => {
      musicState.isMuted = true;
      sfxState.sfxMuted = true;

      render(<SurvivalAudioEffectsControls t={t} />);
      expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
    });
  });

  describe('effects toggle', () => {
    it('toggles reduced-effects when clicked', () => {
      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(effectsButton());

      expect(toggleEffects).toHaveBeenCalledTimes(1);
    });

    it('exposes effects state via aria-pressed (off by default → not pressed)', () => {
      render(<SurvivalAudioEffectsControls t={t} />);
      expect(effectsButton()).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
