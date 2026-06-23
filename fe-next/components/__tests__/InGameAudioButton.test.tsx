import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Behavior tests for the global in-game mute button.
 *
 * The app's MusicControls live in the global header, which AutoHideHeader removes
 * during active gameplay. Most game modes (single player, blast, wordcraft, brain
 * drills, adventure, multiplayer...) therefore had NO on-screen mute control while
 * playing. This single FAB is mounted once in the locale layout and appears
 * whenever NavigationContext reports active gameplay (isInGame) — but never during
 * a passive TV broadcast (isTvFullscreen).
 *
 * Mute behaviour mirrors MusicControls' master mute via resolveMasterMuteClick:
 *   - any channel audible → mute both
 *   - both already muted   → unmute both
 *   - locked audio         → unlock first, move toward audible
 */

const navState = { isInGame: false, headerAudioControlActive: false };
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
let tvFullscreen = false;

vi.mock('@/contexts/NavigationContext', () => ({ useNavigation: () => navState }));
vi.mock('@/contexts/MusicContext', () => ({ useMusic: () => musicState }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfxState }));
vi.mock('@/hooks/useTvFullscreenListener', () => ({
  useTvFullscreenListener: () => tvFullscreen,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => f ?? k, language: 'en' }),
}));

// Import AFTER mocks so the component closes over them.
import InGameAudioButton from '../InGameAudioButton';

function resetState() {
  navState.isInGame = false;
  navState.headerAudioControlActive = false;
  musicState.isMuted = false;
  musicState.audioUnlocked = true;
  musicState.toggleMute.mockClear();
  musicState.unlockAudio.mockClear();
  sfxState.sfxMuted = false;
  sfxState.toggleSfxMute.mockClear();
  tvFullscreen = false;
}

const muteButton = () => screen.getByRole('button', { name: /mute|unmute/i });

describe('InGameAudioButton', () => {
  beforeEach(resetState);
  afterEach(cleanup);

  it('renders nothing when not in a game', () => {
    const { container } = render(<InGameAudioButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a mute button during active gameplay', () => {
    navState.isInGame = true;
    render(<InGameAudioButton />);
    expect(muteButton()).toBeInTheDocument();
  });

  it('stays hidden during a passive TV broadcast even while in game', () => {
    navState.isInGame = true;
    tvFullscreen = true;
    const { container } = render(<InGameAudioButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stands down when a screen header already hosts a mute control', () => {
    navState.isInGame = true;
    navState.headerAudioControlActive = true;
    const { container } = render(<InGameAudioButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mutes both music and SFX when both are audible', () => {
    navState.isInGame = true;
    render(<InGameAudioButton />);
    fireEvent.click(muteButton());
    expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
    expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
  });

  it('unmutes both when both are muted', () => {
    navState.isInGame = true;
    musicState.isMuted = true;
    sfxState.sfxMuted = true;
    render(<InGameAudioButton />);
    fireEvent.click(muteButton());
    expect(musicState.toggleMute).toHaveBeenCalledTimes(1);
    expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
  });

  it('corrects drift: only music muted → mutes SFX, leaves music muted', () => {
    navState.isInGame = true;
    musicState.isMuted = true;
    sfxState.sfxMuted = false;
    render(<InGameAudioButton />);
    fireEvent.click(muteButton());
    expect(musicState.toggleMute).not.toHaveBeenCalled();
    expect(sfxState.toggleSfxMute).toHaveBeenCalledTimes(1);
  });

  it('unlocks audio (toggles nothing) when locked and both audible', () => {
    navState.isInGame = true;
    musicState.audioUnlocked = false;
    render(<InGameAudioButton />);
    fireEvent.click(muteButton());
    expect(musicState.unlockAudio).toHaveBeenCalledTimes(1);
    expect(musicState.toggleMute).not.toHaveBeenCalled();
    expect(sfxState.toggleSfxMute).not.toHaveBeenCalled();
  });

  it('shows the unmute affordance when both channels are muted', () => {
    navState.isInGame = true;
    musicState.isMuted = true;
    sfxState.sfxMuted = true;
    render(<InGameAudioButton />);
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
    expect(muteButton()).toHaveAttribute('aria-pressed', 'false');
  });
});
