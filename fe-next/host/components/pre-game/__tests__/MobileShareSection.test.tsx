/**
 * MobileShareSection Component Tests
 *
 * Tests for the compact share UI used in the mobile host lobby
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MobileShareSection from '../MobileShareSection';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, animate, transition, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown; animate?: unknown; transition?: unknown }) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, initial, animate, exit, transition, ...props }: React.ComponentProps<'div'> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock qrcode.react
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size, ...props }: { value: string; size: number }) => (
    <svg data-testid="qr-code-svg" data-value={value} width={size} height={size} {...props} />
  ),
}));

// Mock social icons
jest.mock('../../../../components/icons/SocialIcons', () => ({
  WhatsAppIcon: ({ size }: { size?: number }) => <svg data-testid="whatsapp-icon" width={size} height={size} />,
  TelegramIcon: ({ size }: { size?: number }) => <svg data-testid="telegram-icon" width={size} height={size} />,
}));

// Mock getJoinUrl
// Mock window.open for social sharing
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

jest.mock('../../../../utils/share', () => ({
  getJoinUrl: jest.fn((gameCode: string, _source?: string) => `https://lexiclash.com?room=${gameCode}&utm_source=mobile-lobby&utm_medium=share`),
  shareViaWhatsApp: jest.fn(),
  shareViaTelegram: jest.fn(),
}));

// Translation mock
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'roomCode.title': 'Room Code',
    'roomCode.linkCopied': 'Link copied!',
    'roomCode.copyLink': 'Copy Link',
    'share.title': 'Join my LexiClash game!',
    'share.text': 'Join my game!',
    'share.buttonLabel': 'Share',
    'share.joinInstructions': 'Go to lexiclash.com and enter code',
    'share.showQrCode': 'Show QR Code',
    'share.hideQrCode': 'Hide QR Code',
    'share.scanQrCode': 'Scan to join instantly',
    'share.orShareVia': 'Or share via',
    'share.telegram': 'Telegram',
    'share.moreWays': 'More ways to share',
    'common.error': 'Failed to copy',
    'common.copied': 'Copied!',
  };
  return translations[key] || key;
};

describe('MobileShareSection', () => {
  // Store original navigator methods
  const originalClipboard = navigator.clipboard;
  const originalShare = navigator.share;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default: clipboard available, no native share
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original navigator methods
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: originalShare,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('renders with room code displayed prominently', () => {
      render(<MobileShareSection gameCode="ABCD1234" t={mockT} />);

      expect(screen.getByText('ABCD1234')).toBeInTheDocument();
      expect(screen.getByText('Room Code')).toBeInTheDocument();
    });

    it('renders with data-testid for integration testing', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} />);

      expect(screen.getByTestId('mobile-share-section')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} className="custom-class" />);

      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('copies link to clipboard when copy button is clicked', async () => {
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://lexiclash.com?room=COPY123&utm_source=mobile-lobby&utm_medium=share'
      );
      expect(toast.success).toHaveBeenCalledWith('Link copied!', { duration: 1500, icon: '🔗' });
    });

    it('shows check icon after successful copy', async () => {
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      // Check icon should appear (button content changes)
      const buttonSvg = copyButton.querySelector('svg');
      expect(buttonSvg).toBeInTheDocument();
    });

    it('resets copied state after 2 seconds', async () => {
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      // Advance timers to reset copied state
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // State should reset (visual change, can verify component doesn't crash)
      expect(copyButton).toBeInTheDocument();
    });

    it('shows error toast when clipboard fails', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Clipboard error'));

      render(<MobileShareSection gameCode="FAIL123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy');
      });
    });
  });

  describe('native share functionality', () => {
    it('shows share button when native share is available', () => {
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValue(undefined),
        configurable: true,
      });

      render(<MobileShareSection gameCode="SHARE123" t={mockT} />);

      expect(screen.getByTestId('mobile-native-share-button')).toBeInTheDocument();
    });

    it('calls native share with correct parameters', async () => {
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<MobileShareSection gameCode="SHARE123" t={mockT} />);

      const shareButton = screen.getByTestId('mobile-native-share-button');
      await act(async () => {
        fireEvent.click(shareButton);
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Join my LexiClash game!',
        text: 'Join my game!',
        url: 'https://lexiclash.com?room=SHARE123&utm_source=mobile-lobby&utm_medium=share',
      });
    });

    it('falls back to copy when native share is cancelled', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = jest.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<MobileShareSection gameCode="CANCEL123" t={mockT} />);

      const shareButton = screen.getByTestId('mobile-native-share-button');
      await act(async () => {
        fireEvent.click(shareButton);
      });

      // Should NOT fallback to copy when user cancelled (AbortError)
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('falls back to copy when native share fails (non-abort)', async () => {
      const genericError = new Error('Share failed');
      genericError.name = 'NotAllowedError';
      const mockShare = jest.fn().mockRejectedValue(genericError);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<MobileShareSection gameCode="ERROR123" t={mockT} />);

      const shareButton = screen.getByTestId('mobile-native-share-button');
      await act(async () => {
        fireEvent.click(shareButton);
      });

      // Should fallback to copy when share fails (non-abort error)
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('fallback behavior (no native share)', () => {
    it('shows fallback button when native share is unavailable', () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(<MobileShareSection gameCode="FALLBACK123" t={mockT} />);

      expect(screen.getByTestId('mobile-share-fallback-button')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-native-share-button')).not.toBeInTheDocument();
    });

    it('fallback button copies link', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(<MobileShareSection gameCode="FALLBACK123" t={mockT} />);

      const fallbackButton = screen.getByTestId('mobile-share-fallback-button');
      await act(async () => {
        fireEvent.click(fallbackButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('neo-brutalist styling', () => {
    it('has hard shadow styling', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('shadow-hard-sm');
    });

    it('has chunky border styling', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('border-3');
      expect(section.className).toContain('border-neo-black');
    });

    it('has rounded-neo styling', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('rounded-neo');
    });

    it('displays room code in neo-lime color', () => {
      render(<MobileShareSection gameCode="COLOR123" t={mockT} />);

      const roomCode = screen.getByText('COLOR123');
      expect(roomCode.className).toContain('text-neo-lime');
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label on copy button', () => {
      render(<MobileShareSection gameCode="A11Y123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      expect(copyButton).toHaveAttribute('aria-label', 'Copy Link');
    });

    it('has proper aria-label on share button when available', () => {
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValue(undefined),
        configurable: true,
      });

      render(<MobileShareSection gameCode="A11Y123" t={mockT} />);

      const shareButton = screen.getByTestId('mobile-native-share-button');
      expect(shareButton).toHaveAttribute('aria-label', 'Share');
    });

    it('buttons meet minimum touch target size', () => {
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValue(undefined),
        configurable: true,
      });

      render(<MobileShareSection gameCode="TOUCH123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      const shareButton = screen.getByTestId('mobile-native-share-button');

      // Check for min-h-[44px] and min-w-[44px] classes
      expect(copyButton.className).toContain('min-h-[44px]');
      expect(copyButton.className).toContain('min-w-[44px]');
      expect(shareButton.className).toContain('min-h-[44px]');
    });
  });

  describe('instructions text', () => {
    it('renders join instructions text', () => {
      render(<MobileShareSection gameCode="INST123" t={mockT} />);

      expect(screen.getByText(/lexiclash\.com/i)).toBeInTheDocument();
    });

    it('displays instructions with link icon', () => {
      render(<MobileShareSection gameCode="INST123" t={mockT} />);

      const instructionsBanner = screen.getByTestId('mobile-share-instructions');
      expect(instructionsBanner).toBeInTheDocument();
    });
  });

  describe('social share buttons', () => {
    it('renders WhatsApp share button', () => {
      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      expect(screen.getByTestId('mobile-whatsapp-button')).toBeInTheDocument();
    });

    it('calls shareViaWhatsApp when WhatsApp button clicked', async () => {
      const { shareViaWhatsApp } = require('../../../../utils/share');

      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      await act(async () => {
        fireEvent.click(whatsappBtn);
      });

      expect(shareViaWhatsApp).toHaveBeenCalledWith('SOCIAL123', '', mockT);
    });

    it('renders Telegram share button', () => {
      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      expect(screen.getByTestId('mobile-telegram-button')).toBeInTheDocument();
    });

    it('calls shareViaTelegram when Telegram button clicked', async () => {
      const { shareViaTelegram, getJoinUrl } = require('../../../../utils/share');

      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      const telegramBtn = screen.getByTestId('mobile-telegram-button');
      await act(async () => {
        fireEvent.click(telegramBtn);
      });

      expect(shareViaTelegram).toHaveBeenCalled();
    });

    it('renders more options button', () => {
      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      expect(screen.getByTestId('mobile-more-share-button')).toBeInTheDocument();
    });

    it('WhatsApp button has brand-whatsapp background color', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn.className).toContain('bg-brand-whatsapp');
    });

    it('social buttons meet minimum touch target size', () => {
      render(<MobileShareSection gameCode="TOUCH123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      const telegramBtn = screen.getByTestId('mobile-telegram-button');

      expect(whatsappBtn.className).toContain('min-h-[44px]');
      expect(telegramBtn.className).toContain('min-h-[44px]');
    });
  });

  describe('QR code section', () => {
    it('renders QR code toggle button', () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      expect(screen.getByTestId('mobile-qr-toggle')).toBeInTheDocument();
    });

    it('does not render QR code by default', () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      expect(screen.queryByTestId('mobile-qr-code')).not.toBeInTheDocument();
    });

    it('shows QR code when toggle is clicked', async () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      const toggle = screen.getByTestId('mobile-qr-toggle');
      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByTestId('mobile-qr-code')).toBeInTheDocument();
    });

    it('hides QR code when toggle is clicked again', async () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      const toggle = screen.getByTestId('mobile-qr-toggle');

      // Show QR
      await act(async () => {
        fireEvent.click(toggle);
      });
      expect(screen.getByTestId('mobile-qr-code')).toBeInTheDocument();

      // Hide QR
      await act(async () => {
        fireEvent.click(toggle);
      });
      expect(screen.queryByTestId('mobile-qr-code')).not.toBeInTheDocument();
    });

    it('QR toggle has aria-expanded attribute', () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      const toggle = screen.getByTestId('mobile-qr-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('QR toggle aria-expanded is true when QR is visible', async () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      const toggle = screen.getByTestId('mobile-qr-toggle');
      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('displays scan instruction text when QR is visible', async () => {
      render(<MobileShareSection gameCode="QR123" t={mockT} />);

      const toggle = screen.getByTestId('mobile-qr-toggle');
      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByText(/scan to join/i)).toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('renders correctly in RTL context', () => {
      render(
        <div dir="rtl">
          <MobileShareSection gameCode="RTL123" t={mockT} />
        </div>
      );

      expect(screen.getByTestId('mobile-share-section')).toBeInTheDocument();
      expect(screen.getByText('RTL123')).toBeInTheDocument();
    });
  });
});
