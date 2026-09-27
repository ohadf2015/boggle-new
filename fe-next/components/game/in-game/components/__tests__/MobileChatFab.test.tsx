/**
 * MobileChatFab Tests
 * Non-intrusive chat for mobile multiplayer gameplay.
 * Invisible by default — only shows badge when a new message arrives via socket.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SocketContext } from '@/utils/SocketContext';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/components/RoomChat', () => ({
  __esModule: true,
  default: ({ username }: { username: string }) => (
    <div data-testid="room-chat">Chat for {username}</div>
  ),
}));

import { MobileChatFab } from '../MobileChatFab';

// Track socket event handlers
const socketHandlers: Record<string, Function[]> = {};
function createMockSocket() {
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!socketHandlers[event]) socketHandlers[event] = [];
      socketHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (socketHandlers[event]) {
        socketHandlers[event] = socketHandlers[event].filter(h => h !== handler);
      }
    }),
    emit: vi.fn(),
    connected: true,
    id: 'test-socket',
  };
}

function simulateChatMessage(from: string) {
  (socketHandlers['chatMessage'] || []).forEach(h => h({ username: from }));
}

function renderWithSocket(ui: React.ReactElement, socket = createMockSocket()) {
  const contextValue = {
    socket: socket as any,
    isConnected: true,
    connectionError: null,
    isReconnecting: false,
    getReconnectAttempt: () => 0,
    maxReconnectAttempts: 20,
    manualReconnect: vi.fn(),
  };
  return render(
    <SocketContext.Provider value={contextValue}>
      {ui}
    </SocketContext.Provider>
  );
}

describe('MobileChatFab', () => {
  const defaultProps = {
    username: 'TestPlayer',
    isHost: false,
    gameCode: 'ABC123',
  };

  beforeEach(() => {
    Object.keys(socketHandlers).forEach(k => delete socketHandlers[k]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be completely invisible by default — no buttons during gameplay', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show badge when another player sends a chat message', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => { simulateChatMessage('OtherPlayer'); });

    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
  });

  it('should NOT show badge for own messages', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);

    act(() => { simulateChatMessage('TestPlayer'); });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should auto-hide badge after 5 seconds', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);

    act(() => { simulateChatMessage('OtherPlayer'); });
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });

    // After 5 seconds, hasUnread becomes false and AnimatePresence removes the badge
    // With a mocked AnimatePresence, the badge is removed immediately (no exit animation runs)
    expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument();
  });

  it('should open chat sheet when badge is tapped', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);

    act(() => { simulateChatMessage('OtherPlayer'); });
    fireEvent.click(screen.getByRole('button', { name: /chat/i }));

    expect(screen.getByTestId('room-chat')).toBeInTheDocument();
    expect(screen.getByTestId('room-chat')).toHaveTextContent('Chat for TestPlayer');
  });

  it('should close chat sheet when close button is clicked', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} />);

    act(() => { simulateChatMessage('OtherPlayer'); });
    fireEvent.click(screen.getByRole('button', { name: /chat/i }));
    expect(screen.getByTestId('room-chat')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    // With a mocked AnimatePresence, the chat sheet is removed immediately (no exit animation runs)
    // The real test is that the sheet is no longer in the document
    expect(screen.queryByTestId('room-chat')).not.toBeInTheDocument();
  });

  it('should use "Host" as username when isHost is true', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} isHost={true} />);

    act(() => { simulateChatMessage('OtherPlayer'); });
    fireEvent.click(screen.getByRole('button', { name: /chat/i }));

    expect(screen.getByTestId('room-chat')).toHaveTextContent('Chat for Host');
  });

  it('should NOT show badge for host messages when isHost is true', () => {
    renderWithSocket(<MobileChatFab {...defaultProps} isHost={true} />);

    act(() => { simulateChatMessage('Host'); });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
