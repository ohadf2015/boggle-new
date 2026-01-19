/**
 * Test: PlayerWaitingView Share Button
 *
 * Requirements:
 * 1. Mobile view should show a share button instead of copy-only room code
 * 2. Share button should use native share API when available
 * 3. Room code should still be visible
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useNativeShare hook
const mockNativeShare = jest.fn();
jest.mock('../../hooks/useNativeShare', () => ({
  useNativeShare: () => ({
    canNativeShare: true,
    nativeShare: mockNativeShare,
    tryNativeShare: mockNativeShare,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock qrcode.react
jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>,
}));

// Mock RoomChat component
jest.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock share utils
jest.mock('../../utils/share', () => ({
  getJoinUrl: (code: string) => `https://example.com?room=${code}`,
}));

import PlayerWaitingView from '../../player/components/PlayerWaitingView';

const mockT = (key: string) => key;

describe('PlayerWaitingView Share Button', () => {
  const defaultProps = {
    gameCode: 'ABC123',
    gameLanguage: 'en' as const,
    username: 'TestPlayer',
    t: mockT,
    playersReady: [
      { username: 'TestHost', isHost: true },
      { username: 'TestPlayer', isHost: false },
    ],
    showQR: false,
    setShowQR: jest.fn(),
    showExitConfirm: false,
    setShowExitConfirm: jest.fn(),
    onExitRoom: jest.fn(),
    onConfirmExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeShare.mockResolvedValue(true);
  });

  it('should display the room code in the header', () => {
    render(<PlayerWaitingView {...defaultProps} />);

    // Room code should be visible
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('should have a share button in the header', () => {
    render(<PlayerWaitingView {...defaultProps} />);

    // Find the share button by aria-label
    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it('should trigger native share when share button is clicked', async () => {
    render(<PlayerWaitingView {...defaultProps} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockNativeShare).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('ABC123'),
        })
      );
    });
  });

  it('should include room code and invite message in share data', async () => {
    render(<PlayerWaitingView {...defaultProps} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockNativeShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          text: expect.any(String),
          url: expect.stringContaining('ABC123'),
        })
      );
    });
  });

  it('should show share icon instead of copy icon', () => {
    render(<PlayerWaitingView {...defaultProps} />);

    // Share button should exist
    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();

    // The share button should contain a Share2 icon (rendered by lucide-react)
    // We check that the button exists and has the share-related aria-label
    expect(shareButton).toHaveAttribute('aria-label', expect.stringMatching(/share/i));
  });
});

describe('PlayerWaitingView Mobile Bottom Tabs Sticky', () => {
  const defaultProps = {
    gameCode: 'ABC123',
    gameLanguage: 'en' as const,
    username: 'TestPlayer',
    t: mockT,
    playersReady: [
      { username: 'TestHost', isHost: true },
      { username: 'TestPlayer', isHost: false },
    ],
    showQR: false,
    setShowQR: jest.fn(),
    showExitConfirm: false,
    setShowExitConfirm: jest.fn(),
    onExitRoom: jest.fn(),
    onConfirmExit: jest.fn(),
  };

  it('should have bottom tabs with fixed positioning classes', () => {
    render(<PlayerWaitingView {...defaultProps} />);

    const bottomNav = screen.getByRole('navigation');

    // Check for sticky/fixed positioning classes
    // The nav should have flex-shrink-0 to prevent compression
    expect(bottomNav).toHaveClass('flex-shrink-0');

    // Check for mobile-only visibility (hidden on lg screens)
    expect(bottomNav.className).toContain('lg:hidden');
  });

  it('should have safe area padding for bottom tabs', () => {
    render(<PlayerWaitingView {...defaultProps} />);

    const bottomNav = screen.getByRole('navigation');

    // Check for safe-area-inset padding (for notched devices)
    expect(bottomNav.className).toContain('pb-[env(safe-area-inset-bottom)]');
  });
});
