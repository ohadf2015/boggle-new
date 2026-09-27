import { vi } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * MusicControls is the header's sound control. The global in-game mute FAB
 * (InGameAudioButton) is meant to appear ONLY when the header — and thus its
 * MusicControls — is hidden during gameplay. On screens that render <Header />
 * directly (landing, word-craft, gem-hunt) the header stays visible, so without
 * an explicit hand-off the FAB and the header control both show and the fixed
 * FAB overlaps the menu button ("sound control shows twice / hides the menu").
 *
 * Fix: MusicControls registers an in-header audio control while mounted (the same
 * mechanism the MP LobbyAudioButton uses), so the FAB stands down whenever a
 * header sound control is on screen — regardless of the isInGame flag.
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

vi.mock('../../contexts/MusicContext', () => ({ useMusic: () => musicState }));
vi.mock('../../contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfxState }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../../contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ enabled: false, setEnabled: vi.fn() }),
}));

// Spy on the header-audio-control registration.
const registerCleanup = vi.fn();
const registerHeaderAudioControl = vi.fn(() => registerCleanup);
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: (active = true) => {
    React.useEffect(() => {
      if (!active) return;
      return registerHeaderAudioControl();
    }, [active]);
  },
}));

// Import AFTER mocks so the component closes over them.
import MusicControls from '../MusicControls';

describe('MusicControls — header audio control hand-off', () => {
  beforeEach(() => {
    registerCleanup.mockClear();
    registerHeaderAudioControl.mockClear();
  });
  afterEach(cleanup);

  it('registers an in-header audio control while mounted (so the global FAB stands down)', () => {
    render(<MusicControls />);
    expect(registerHeaderAudioControl).toHaveBeenCalledTimes(1);
  });

  it('unregisters on unmount so the FAB can return once the header is gone', () => {
    const { unmount } = render(<MusicControls />);
    expect(registerCleanup).not.toHaveBeenCalled();
    unmount();
    expect(registerCleanup).toHaveBeenCalledTimes(1);
  });
});
