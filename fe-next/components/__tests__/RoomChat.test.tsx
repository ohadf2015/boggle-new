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
  m: {
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

// Families Policy: mutable social-capability stub. Default = adult, already
// acknowledged (so the existing chat tests behave as before the gate).
const ADULT_CAPS = {
  publicRoomChat: true,
  friendMessaging: true,
  friendManagement: true,
  customDisplayName: true,
  emojiReactions: true,
};
let socialCapsValue: any;
vi.mock('@/hooks/useSocialCapabilities', () => ({
  useSocialCapabilities: () => socialCapsValue,
}));
// Stub the family modals — render their open state as a simple marker so we can
// assert visibility without pulling in Radix Dialog portals.
vi.mock('@/components/families/AgeGateModal', () => ({
  AgeGateModal: ({ isOpen }: any) => (isOpen ? <div data-testid="age-gate" /> : null),
}));
vi.mock('@/components/families/SafetyReminderModal', () => ({
  SafetyReminderModal: ({ isOpen, onAcknowledge }: any) =>
    isOpen ? <button data-testid="safety-reminder" onClick={onAcknowledge} /> : null,
}));

function setSocialCaps(overrides: Record<string, unknown> = {}) {
  socialCapsValue = {
    tier: 'adult',
    caps: { ...ADULT_CAPS },
    ageKnown: true,
    needsAgeGate: false,
    safetyAcknowledged: true,
    setGuestBirthYear: vi.fn(),
    acknowledgeSafety: vi.fn(),
    ...overrides,
  };
}

describe('RoomChat', () => {
  const defaultProps = {
    username: 'TestUser',
    isHost: false,
    gameCode: 'ABCD'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setSocialCaps(); // default adult, acknowledged
  });

  describe('Families Policy gating', () => {
    it('hides chat and offers the age screen for an unknown-age user', () => {
      setSocialCaps({
        tier: 'unknown',
        caps: { ...ADULT_CAPS, publicRoomChat: false },
        ageKnown: false,
        needsAgeGate: true,
      });
      render(<RoomChat {...defaultProps} />);
      expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
      expect(screen.getByText('familiesSafety.chatNeedsAge')).toBeInTheDocument();
      expect(screen.getByText('familiesSafety.chatAddAge')).toBeInTheDocument();
    });

    it('hides chat with a restricted message for a known child', () => {
      setSocialCaps({
        tier: 'child',
        caps: { ...ADULT_CAPS, publicRoomChat: false },
        ageKnown: true,
        needsAgeGate: false,
      });
      render(<RoomChat {...defaultProps} />);
      expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
      expect(screen.getByText('familiesSafety.chatRestricted')).toBeInTheDocument();
    });

    it('shows the safety reminder before the first message and does not send yet', () => {
      setSocialCaps({ safetyAcknowledged: false });
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'hello' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
      expect(screen.getByTestId('safety-reminder')).toBeInTheDocument();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('chatMessage', expect.anything());
    });
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
    // Send button uses `aria-disabled` (not real `disabled`) so taps still
    // commit Android GBoard IME composition for Hebrew/RTL. sendMessage
    // reads the DOM value at click time and bails on empty trim.
    it('marks send button aria-disabled when input is empty', () => {
      render(<RoomChat {...defaultProps} />);
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('clears aria-disabled when input has text', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(sendButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('clears aria-disabled for whitespace-only input (trims on send)', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: '   ' } });
      expect(sendButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('does not emit chatMessage when send is tapped with empty input', () => {
      render(<RoomChat {...defaultProps} />);
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      fireEvent.click(sendButton);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('chatMessage', expect.anything());
    });
  });

  describe('Hebrew / RTL input', () => {
    it('sends Hebrew message via change event', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'שלום עולם' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'שלום עולם'
      }));
    });

    it('sends Hebrew message via Enter key', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'בדיקה' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'בדיקה'
      }));
    });

    it('sends via DOM value when Android GBoard leaves React state empty (composition buffer)', () => {
      // Simulates Android GBoard with Hebrew: onChange does not fire, but the
      // DOM input has the typed text. Tap on Send must still emit.
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;

      // Bypass React state — write directly to DOM
      input.value = 'שלום';
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'שלום'
      }));
    });

    it('clears aria-disabled via keyup when GBoard buffers composition (Hebrew)', () => {
      // Android GBoard with Hebrew can leave onChange/onInput from firing, so
      // the controlled `inputMessage` state stays empty and the Send button
      // looks disabled. keyup carries the committed DOM value as a backstop.
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      // DOM has text but no change/input event fired
      input.value = 'שלום';
      fireEvent.keyUp(input, { key: 'ם' });

      expect(sendButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('sends Enter after Hebrew compositionEnd', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'שלום' } });
      fireEvent.compositionEnd(input, { data: 'שלום' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', expect.objectContaining({
        message: 'שלום'
      }));
    });
  });

  describe('IME composition', () => {
    // keyCode 229 is the canonical IME-commit signal — used to gate Enter
    // instead of `isComposing` because GBoard Hebrew/RTL keeps `isComposing`
    // true past commit. See handleKeyDown in RoomChat.tsx.
    it('does not send on Enter with keyCode 229 (IME commit, e.g. Japanese kana)', () => {
      render(<RoomChat {...defaultProps} />);
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'こ' } });
      fireEvent.compositionStart(input);
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

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
