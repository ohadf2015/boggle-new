import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PlayerWaitingView from '../PlayerWaitingView';

const handlers = new Map<string, (d: unknown) => void>();
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn((e: string, fn: (d: unknown) => void) => handlers.set(e, fn)),
  off: vi.fn(),
};
vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
  useSocketOptional: () => ({ socket: mockSocket }),
}));
vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => <div data-testid="mobile-share-section" /> }));
vi.mock('../../../host/components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => <button data-testid="lobby-audio-button" aria-label="Mute" /> }));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../host/components/pre-game/GameInstructions', () => ({
  GameInstructions: ({ selectedGameMode }: { selectedGameMode: string }) => <div data-testid="game-instructions" data-mode={selectedGameMode} />,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }) }));
vi.mock('@/hooks/gameState', () => ({ useGameMode: () => 'classic', useHostSelectedGameMode: () => 'random' }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null, setStoredCustomAvatar: vi.fn() }));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/DJMascot', () => ({ DJMascot: () => <div data-testid="dj" /> }));

const props = {
  gameCode: 'ABCD',
  gameLanguage: 'en' as const,
  username: 'Ada',
  t: (key: string) => key,
  playersReady: [
    { username: 'Host', isHost: true },
    { username: 'Ada' },
    'Bo',
    { username: 'Bot Lexi', isBot: true },
  ],
  showQR: false,
  setShowQR: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
};

/** The phone (<720px) tree. */
const phone = () => within(screen.getByTestId('lobby-phone'));

describe('PlayerWaitingView — joiner lobby on the shell', () => {
  it('seats the whole room — host, bots and bare-string players (never "PLAYERS 0")', () => {
    render(<PlayerWaitingView {...props} />);
    const seats = phone().getAllByTestId('lobby-seat');
    expect(seats.map((s) => s.getAttribute('data-player'))).toEqual(['Host', 'Ada', 'Bo', 'Bot Lexi']);
    expect(phone().getByText('4/8')).toBeInTheDocument();
  });

  it('keeps chat out of the phone body: it opens in a sheet from the header', () => {
    render(<PlayerWaitingView {...props} />);
    expect(phone().queryByTestId('room-chat')).toBeNull();
    fireEvent.click(screen.getByTestId('lobby-chat-button'));
    expect(within(screen.getByTestId('lobby-chat-sheet')).getByTestId('room-chat')).toBeInTheDocument();
  });

  it('badges the chat icon with unread messages from others', () => {
    render(<PlayerWaitingView {...props} />);
    act(() => handlers.get('chatMessage')?.({ username: 'Bo', message: 'hi' }));
    expect(screen.getByTestId('lobby-chat-unread')).toHaveTextContent('1');
  });

  it('opens how-to-play in a sheet instead of an in-body accordion', () => {
    render(<PlayerWaitingView {...props} />);
    expect(phone().queryByTestId('game-instructions')).toBeNull();
    fireEvent.click(phone().getByText('mpUi.lobby.howToPlay'));
    expect(within(screen.getByTestId('lobby-howto-sheet')).getByTestId('game-instructions')).toHaveAttribute('data-mode', 'classic');
  });
});
