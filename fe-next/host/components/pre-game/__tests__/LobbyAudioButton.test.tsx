import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * LobbyAudioButton — the in-header mute control for the MP host lobby.
 *
 * It (1) toggles the shared master mute and (2) registers an in-header audio
 * control so the global floating FAB stands down while it is mounted.
 */

const master = {
  allMuted: false,
  toggle: vi.fn(),
  label: 'Mute',
  title: 'Sound on',
};
const registerCleanup = vi.fn();
const registerHeaderAudioControl = vi.fn(() => registerCleanup);

vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => master }));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: (active = true) => {
    React.useEffect(() => {
      if (!active) return;
      return registerHeaderAudioControl();
    }, [active]);
  },
}));

import { LobbyAudioButton } from '../LobbyAudioButton';

function reset() {
  master.allMuted = false;
  master.toggle.mockClear();
  registerCleanup.mockClear();
  registerHeaderAudioControl.mockClear();
}

describe('LobbyAudioButton', () => {
  beforeEach(reset);
  afterEach(cleanup);

  it('renders a mute control in the header', () => {
    render(<LobbyAudioButton />);
    expect(screen.getByTestId('lobby-audio-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the shared master mute on click', () => {
    render(<LobbyAudioButton />);
    fireEvent.click(screen.getByTestId('lobby-audio-button'));
    expect(master.toggle).toHaveBeenCalledTimes(1);
  });

  it('shows the unmute affordance when everything is muted', () => {
    master.allMuted = true;
    master.label = 'Unmute';
    render(<LobbyAudioButton />);
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'false');
    master.label = 'Mute';
  });

  it('registers an in-header audio control while mounted and cleans up on unmount', () => {
    const { unmount } = render(<LobbyAudioButton />);
    expect(registerHeaderAudioControl).toHaveBeenCalledTimes(1);
    unmount();
    expect(registerCleanup).toHaveBeenCalledTimes(1);
  });
});
