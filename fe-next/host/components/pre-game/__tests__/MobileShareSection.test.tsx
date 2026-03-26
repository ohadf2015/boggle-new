import { vi, type Mock, } from 'vitest';
/**
 * MobileShareSection Component Tests
 *
 * Tests for the compact horizontal pill share strip in the mobile host lobby.
 * Layout: Copy Link | WhatsApp | Telegram (inline pills)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MobileShareSection from '../MobileShareSection';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, animate, transition, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown; animate?: unknown; transition?: unknown }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock social icons
vi.mock('../../../../components/icons/SocialIcons', () => ({
  WhatsAppIcon: ({ size }: { size?: number }) => <svg data-testid="whatsapp-icon" width={size} height={size} />,
  TelegramIcon: ({ size }: { size?: number }) => <svg data-testid="telegram-icon" width={size} height={size} />,
}));

// Mock share utils
vi.mock('../../../../utils/share', () => ({
  getJoinUrl: vi.fn((gameCode: string, _source?: string) => `https://lexiclash.com?room=${gameCode}&utm_source=mobile-lobby&utm_medium=share`),
  copyJoinUrl: vi.fn().mockResolvedValue(true),
  shareViaWhatsApp: vi.fn(),
  shareViaTelegram: vi.fn(),
}));

// Translation mock
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'roomCode.linkCopied': 'Link copied!',
    'roomCode.copyLink': 'Copy Link',
    'share.copyLink': 'Copy Link',
    'share.telegram': 'Telegram',
    'share.inviteMessage': 'Join my LexiClash game!',
    'share.code': 'Code',
    'common.error': 'Failed to copy',
    'common.copied': 'Copied!',
    'hostView.inviteFriends': 'Invite Friends',
  };
  return translations[key] || key;
};

describe('MobileShareSection', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('renders with data-testid for integration testing', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} />);
      expect(screen.getByTestId('mobile-share-section')).toBeInTheDocument();
    });

    it('renders section title', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} />);
      expect(screen.getByText('Invite Friends')).toBeInTheDocument();
    });

    it('renders all three share buttons', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} />);
      expect(screen.getByTestId('mobile-copy-link-button')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-whatsapp-button')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-telegram-button')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} className="custom-class" />);
      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('copies link to clipboard when copy button is clicked', async () => {
      const { copyJoinUrl } = require('../../../../utils/share');
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(copyJoinUrl).toHaveBeenCalledWith('COPY123', mockT, 'mobile-lobby');
    });

    it('shows Copied! text after successful copy', async () => {
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('resets copied state after 2 seconds', async () => {
      render(<MobileShareSection gameCode="COPY123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('does not show Copied! when copyJoinUrl fails', async () => {
      const { copyJoinUrl } = require('../../../../utils/share');
      copyJoinUrl.mockResolvedValueOnce(false);

      render(<MobileShareSection gameCode="FAIL123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });
  });

  describe('social share buttons', () => {
    it('calls shareViaWhatsApp when WhatsApp button clicked', async () => {
      const { shareViaWhatsApp } = require('../../../../utils/share');

      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      await act(async () => {
        fireEvent.click(whatsappBtn);
      });

      expect(shareViaWhatsApp).toHaveBeenCalledWith('SOCIAL123', '', mockT);
    });

    it('calls shareViaTelegram when Telegram button clicked', async () => {
      const { shareViaTelegram } = require('../../../../utils/share');

      render(<MobileShareSection gameCode="SOCIAL123" t={mockT} />);

      const telegramBtn = screen.getByTestId('mobile-telegram-button');
      await act(async () => {
        fireEvent.click(telegramBtn);
      });

      expect(shareViaTelegram).toHaveBeenCalled();
    });

    it('WhatsApp button has brand-whatsapp background color', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn.className).toContain('bg-brand-whatsapp');
    });
  });

  describe('compact pill styling', () => {
    it('buttons use rounded-full pill shape', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('rounded-full');
    });

    it('buttons have fixed height h-11', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('h-11');
    });

    it('buttons have shadow-hard-sm styling', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('shadow-hard-sm');
    });

    it('buttons have border-2 border-neo-black styling', () => {
      render(<MobileShareSection gameCode="STYLE123" t={mockT} />);

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('border-2');
      expect(copyBtn.className).toContain('border-neo-black');
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label on copy button', () => {
      render(<MobileShareSection gameCode="A11Y123" t={mockT} />);

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      expect(copyButton).toHaveAttribute('aria-label', 'Copy Link');
    });

    it('has proper aria-label on WhatsApp button', () => {
      render(<MobileShareSection gameCode="A11Y123" t={mockT} />);

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn).toHaveAttribute('aria-label', 'Share via WhatsApp');
    });

    it('has proper aria-label on Telegram button', () => {
      render(<MobileShareSection gameCode="A11Y123" t={mockT} />);

      const telegramBtn = screen.getByTestId('mobile-telegram-button');
      expect(telegramBtn).toHaveAttribute('aria-label', 'Share via Telegram');
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
    });
  });
});
