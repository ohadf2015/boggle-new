import { vi, describe, it, expect, beforeEach, onTestFinished } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PlayerWaitingView from '../PlayerWaitingView';
import { setLobbyViewport } from '@/components/multiplayer/lobby/__tests__/lobbyViewport';
import { useLobbySettingsStore } from '@/components/multiplayer/lobby/lobbySettingsStore';

const handlers = new Map<string, Set<(d?: unknown) => void>>();
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn((e: string, fn: (d?: unknown) => void) => { if (!handlers.has(e)) handlers.set(e, new Set()); handlers.get(e)!.add(fn); }),
  off: vi.fn((e: string, fn: (d?: unknown) => void) => { handlers.get(e)?.delete(fn); }),
};
const fire = (e: string, d?: unknown) => act(() => { handlers.get(e)?.forEach((h) => h(d)); });

vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
  useSocketOptional: () => ({ socket: mockSocket }),
}));
vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => <div /> }));
vi.mock('../../../host/components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => <button aria-label="Mute" /> }));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div /> }));
vi.mock('../../../components/Avatar', () => ({ default: () => <div /> }));
vi.mock('../../../host/components/pre-game/GameInstructions', () => ({
  GameInstructions: ({ selectedGameMode }: { selectedGameMode: string }) => <div data-testid="game-instructions" data-mode={selectedGameMode} />,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }) }));
vi.mock('@/hooks/gameState', () => ({ useGameMode: () => 'classic', useHostSelectedGameMode: () => 'random' }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null, setStoredCustomAvatar: vi.fn() }));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/DJMascot', () => ({ DJMascot: () => <div /> }));

const props = {
  gameCode: 'ABCD',
  gameLanguage: 'en' as const,
  username: 'Ada',
  t: (key: string) => key,
  playersReady: [{ username: 'Host', isHost: true }, { username: 'Ada' }],
  showQR: false,
  setShowQR: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
};

const BLAST = { gameCode: 'ABCD', mode: 'blast', timerSeconds: 90, difficulty: 'HARD', minWordLength: 3 };
const phone = () => within(screen.getByTestId('lobby-phone'));

describe('PlayerWaitingView — the host\'s lobby pick', () => {
  beforeEach(() => {
    handlers.clear();
    mockSocket.emit.mockClear();
    useLobbySettingsStore.setState({ settings: null });
  });

  it('a late joiner asks the server for the pick', () => {
    render(<PlayerWaitingView {...props} />);
    expect(mockSocket.emit).toHaveBeenCalledWith('requestLobbySettings');
  });

  it('shows nothing about the round until the server answers (no default that flips)', () => {
    render(<PlayerWaitingView {...props} />);
    expect(screen.queryByTestId('lobby-mode-chip')).toBeNull();
    expect(screen.queryByTestId('lobby-settings-summary')).toBeNull();
  });

  it('shows the mode chip and a read-only summary once the host pick arrives', () => {
    render(<PlayerWaitingView {...props} />);
    fire('lobbySettings', BLAST);
    expect(phone().getByTestId('lobby-mode-chip')).toHaveTextContent('gameModes.blast.name');
    const summary = phone().getByTestId('lobby-settings-summary');
    expect(summary.tagName).not.toBe('BUTTON');
    expect(summary).toHaveTextContent('7×7');
    expect(summary).toHaveTextContent('3+');
  });

  it('how-to-play teaches the host\'s mode, not the fallback', () => {
    render(<PlayerWaitingView {...props} />);
    fire('lobbySettings', BLAST);
    fireEvent.click(phone().getByText('mpUi.lobby.howToPlay'));
    expect(within(screen.getByTestId('lobby-howto-sheet')).getByTestId('game-instructions')).toHaveAttribute('data-mode', 'blast');
  });

  it('follows a host change made after the joiner arrived', () => {
    render(<PlayerWaitingView {...props} />);
    fire('lobbySettings', BLAST);
    fire('lobbySettings', { ...BLAST, mode: 'word-hunt', difficulty: 'EASY' });
    expect(phone().getByTestId('lobby-mode-chip')).toHaveTextContent('gameModes.wordHunt.name');
    expect(phone().getByTestId('lobby-settings-summary')).toHaveTextContent('5×5');
  });

  it('desktop shows the same pick', () => {
    setLobbyViewport('desktop');
    onTestFinished(() => setLobbyViewport('phone'));
    render(<PlayerWaitingView {...props} />);
    fire('lobbySettings', BLAST);
    const desktop = within(screen.getByTestId('desktop-lobby-layout'));
    expect(desktop.getByTestId('lobby-mode-chip')).toHaveTextContent('gameModes.blast.name');
    expect(desktop.getByTestId('game-instructions')).toHaveAttribute('data-mode', 'blast');
  });
});
