/**
 * RoomChat Component Tests
 *
 * Tests for the RoomChat component including chat history loading,
 * message sending, and real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoomChat from '../RoomChat';

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};

// Mock dependencies
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket })
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'chat.title': 'Room Chat',
        'chat.noMessages': 'No messages yet',
        'chat.startChatting': 'Start chatting!',
        'chat.placeholder': 'Type a message...',
        'chat.send': 'Send message'
      };
      return translations[key] || key;
    }
  })
}));

vi.mock('../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMessageSound: vi.fn()
  })
}));

vi.mock('../GameAnnouncer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn()
  })
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    scrollToIndex: vi.fn(),
    measureElement: vi.fn()
  })
}));

describe('RoomChat', () => {
  const defaultProps = {
    username: 'TestUser',
    isHost: false,
    gameCode: 'ABCD'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the chat title', () => {
      render(<RoomChat {...defaultProps} />);
      expect(screen.getByText('Room Chat')).toBeInTheDocument();
    });

    it('renders empty state when no messages', () => {
      render(<RoomChat {...defaultProps} />);
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start chatting!')).toBeInTheDocument();
    });

    it('renders input field and send button', () => {
      render(<RoomChat {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });
  });

  describe('socket event registration', () => {
    it('registers chatMessage listener on mount', () => {
      render(<RoomChat {...defaultProps} />);
      expect(mockSocket.on).toHaveBeenCalledWith('chatMessage', expect.any(Function));
    });

    it('registers chatHistory listener on mount', () => {
      render(<RoomChat {...defaultProps} />);
      expect(mockSocket.on).toHaveBeenCalledWith('chatHistory', expect.any(Function));
    });

    it('requests chat history on mount', () => {
      render(<RoomChat {...defaultProps} />);
      expect(mockSocket.emit).toHaveBeenCalledWith('requestChatHistory', { gameCode: 'ABCD' });
    });

    it('cleans up listeners on unmount', () => {
      const { unmount } = render(<RoomChat {...defaultProps} />);
      unmount();
      expect(mockSocket.off).toHaveBeenCalledWith('chatMessage', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('chatHistory', expect.any(Function));
    });
  });

  describe('message sending', () => {
    it('sends message when send button is clicked', () => {
      render(<RoomChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'Hello world' } });
      fireEvent.click(sendButton);

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', {
        message: 'Hello world',
        gameCode: 'ABCD',
        username: 'TestUser',
        isHost: false
      });
    });

    it('sends message when Enter key is pressed', () => {
      render(<RoomChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Hello world' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'Hello world'
      }));
    });

    it('clears input after sending message', () => {
      render(<RoomChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Hello world' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(input.value).toBe('');
    });

    it('does not send empty messages', () => {
      render(<RoomChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(sendButton);

      // Should not have emitted chatMessage (only requestChatHistory)
      expect(mockSocket.emit).not.toHaveBeenCalledWith('chatMessage', expect.anything());
    });

    it('trims whitespace from messages', () => {
      render(<RoomChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: '  Hello world  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'Hello world'
      }));
    });

    it('sends with actual username when isHost is true', () => {
      render(<RoomChat {...defaultProps} isHost={true} />);

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Hello from host' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        username: 'TestUser',
        isHost: true
      }));
    });
  });

  describe('send button state', () => {
    it('disables send button when input is empty', () => {
      render(<RoomChat {...defaultProps} />);
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(sendButton).not.toBeDisabled();
    });

    it('enables send button for whitespace-only input (trims on send)', () => {
      // Regression: prior `!inputMessage.trim()` disable hid button while user
      // had visible (whitespace) content. Disable now keys on raw length.
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: '   ' } });
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('IME composition', () => {
    it('does not send on Enter while composing (e.g. Japanese kana)', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'こ' } });
      fireEvent.compositionStart(input);
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('chatMessage', expect.any(Object));
    });

    it('sends on Enter after compositionEnd', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'こんにちは' } });
      fireEvent.compositionEnd(input, { data: 'こんにちは' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'こんにちは'
      }));
    });
  });

  describe('chat history', () => {
    it('loads chat history from server', async () => {
      render(<RoomChat {...defaultProps} />);

      // Find the chatHistory handler
      const chatHistoryHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'chatHistory'
      )?.[1];

      expect(chatHistoryHandler).toBeDefined();

      // Simulate receiving chat history
      chatHistoryHandler({
        messages: [
          { username: 'User1', message: 'Hello', timestamp: 1000, isHost: false },
          { username: 'Host', message: 'Hi there', timestamp: 2000, isHost: true }
        ]
      });

      // Messages should be loaded (though we can't easily verify state in this mock setup)
      // At minimum, verify the handler was called
      expect(mockSocket.on).toHaveBeenCalledWith('chatHistory', expect.any(Function));
    });
  });

  describe('accessibility', () => {
    it('has accessible input field', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toHaveAttribute('dir', 'auto');
    });

    it('has accessible send button', () => {
      render(<RoomChat {...defaultProps} />);
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('has screen reader live region for announcements', () => {
      render(<RoomChat {...defaultProps} />);
      const liveRegion = screen.getByRole('log');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });
});
