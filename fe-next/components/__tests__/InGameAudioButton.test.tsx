import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react';
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

describe('InGameAudioButton obstruction guard', () => {
  beforeEach(resetState);
  afterEach(() => {
    cleanup();
    // jsdom has no elementsFromPoint — restore the undefined default so the
    // guard's feature-detection branch (typeof !== 'function' → no probing)
    // is what the non-guard tests exercise.
    delete (document as Partial<Document>).elementsFromPoint;
  });

  /** A fake header button parked in the FAB's corner (48px tall). */
  function headerBlocker(bottom = 48): HTMLElement {
    const blocker = document.createElement('button');
    blocker.getBoundingClientRect = () => ({
      top: 0, bottom, left: 0, right: 200, width: 200, height: bottom, x: 0, y: 0, toJSON: () => ({}),
    }) as DOMRect;
    return blocker;
  }

  it('nudges below a header button parked in its corner instead of covering it', async () => {
    navState.isInGame = true;
    const blocker = headerBlocker();
    let probes = 0;
    document.elementsFromPoint = vi.fn(() => {
      probes += 1;
      return probes === 1 ? [blocker] : [];
    }) as unknown as typeof document.elementsFromPoint;

    render(<InGameAudioButton />);

    await waitFor(() => expect(muteButton().style.marginTop).toBe('56px'));
    expect(muteButton()).toBeInTheDocument();
  });

  it('ignores non-interactive overlays in its corner', async () => {
    navState.isInGame = true;
    const inertDiv = document.createElement('div');
    document.elementsFromPoint = vi.fn(() => [inertDiv]) as unknown as typeof document.elementsFromPoint;

    render(<InGameAudioButton />);

    await waitFor(() => expect(document.elementsFromPoint).toHaveBeenCalled());
    expect(muteButton().style.marginTop).toBe('');
  });

  it('stands down entirely when the corner never clears', async () => {
    navState.isInGame = true;
    const blocker = headerBlocker();
    document.elementsFromPoint = vi.fn(() => [blocker]) as unknown as typeof document.elementsFromPoint;

    const { container } = render(<InGameAudioButton />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('does not probe (and renders normally) when elementsFromPoint is unavailable', () => {
    navState.isInGame = true;
    render(<InGameAudioButton />);
    expect(muteButton()).toBeInTheDocument();
    expect(muteButton().style.marginTop).toBe('');
  });
});
