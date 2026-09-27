import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * MusicControls' volume popup opens on hover/focus (role="group") and had no
 * Escape handler — a keyboard user tabbing to the mute button, opening the
 * slider panel via focus, had no way to dismiss it except tabbing away
 * through every slider/toggle inside. Escape should close it like every
 * other floating panel in the app.
 */
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

import MusicControls from '../MusicControls';

describe('MusicControls — Escape closes the volume panel', () => {
  it('closes the slider panel when Escape is pressed while it is open', async () => {
    render(<MusicControls />);
    const group = screen.getByRole('group');

    fireEvent.focus(group);
    await waitFor(() => expect(screen.getByLabelText('music.musicVolumeSlider')).toBeInTheDocument());

    fireEvent.keyDown(group, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByLabelText('music.musicVolumeSlider')).not.toBeInTheDocument());
  });
});
