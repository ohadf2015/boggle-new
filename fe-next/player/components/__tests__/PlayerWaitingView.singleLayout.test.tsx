import { vi, describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerWaitingView from '../PlayerWaitingView';
import { setLobbyViewport } from '@/components/multiplayer/lobby/__tests__/lobbyViewport';

const mockSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
  useSocketOptional: () => ({ socket: mockSocket }),
}));
vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../../../host/components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('../../../components/Avatar', () => ({ default: () => null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }) }));
vi.mock('@/hooks/gameState', () => ({ useGameMode: () => 'classic', useHostSelectedGameMode: () => 'random' }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null, setStoredCustomAvatar: vi.fn() }));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/DJMascot', () => ({ DJMascot: () => null }));

const props = {
  gameCode: 'ABCD', gameLanguage: 'en' as const, username: 'Ada', t: (key: string) => key,
  playersReady: [{ username: 'Host', isHost: true }, { username: 'Ada' }],
  showQR: false, setShowQR: vi.fn(), showExitConfirm: false, setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(), onConfirmExit: vi.fn(), onToggleReady: vi.fn(),
};

describe('PlayerWaitingView mounts one layout', () => {
  afterEach(() => setLobbyViewport('phone'));

  it('on a phone: no desktop rail and no chat mounted until the sheet opens', () => {
    setLobbyViewport('phone');
    render(<PlayerWaitingView {...props} />);
    expect(screen.getByTestId('lobby-phone')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-chat-area')).toBeNull();
    expect(screen.queryByTestId('room-chat')).toBeNull();
    expect(screen.getAllByTestId('ready-button')).toHaveLength(1);
  });

  it('on desktop: one chat in the rail and no phone tree', () => {
    setLobbyViewport('desktop');
    render(<PlayerWaitingView {...props} />);
    expect(screen.queryByTestId('lobby-phone')).toBeNull();
    expect(screen.getAllByTestId('room-chat')).toHaveLength(1);
    expect(screen.getAllByTestId('ready-button')).toHaveLength(1);
  });
});
