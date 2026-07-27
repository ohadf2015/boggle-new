import { vi } from 'vitest';
/**
 * MobileShareSection Component Tests
 *
 * Tests for the share button + dialog in the mobile host lobby.
 * Layout: Single trigger button opens dialog with hero image, room code (tap to copy),
 * Copy Link, WhatsApp, and native share options.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MobileShareSection from '../MobileShareSection';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MotionButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & Record<string, unknown>>(
    ({ children, whileTap, animate, transition, initial, exit, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    ),
  );
  MotionButton.displayName = 'MotionButton';
  const MotionDiv = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, whileTap, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ),
  );
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: { button: MotionButton, div: MotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock next/image
vi.mock('next/image', () => ({
   
  default: ({ src, alt }: { src: string; alt: string; fill?: boolean; className?: string; priority?: boolean }) => (
    <div data-testid="invite-hero-image" data-src={src} role="img" aria-label={alt} />
  ),
}));

// Mock social icons
vi.mock('../../../../components/icons/SocialIcons', () => ({
  WhatsAppIcon: ({ size }: { size?: number }) => <svg data-testid="whatsapp-icon" width={size} height={size} />,
}));

// Mock share utils
vi.mock('../../../../utils/share', () => ({
  getJoinUrl: vi.fn((gameCode: string, _source?: string) => `https://www.lexiclash.live?room=${gameCode}&utm_source=mobile-lobby&utm_medium=share`),
  copyJoinUrl: vi.fn().mockResolvedValue(true),
  shareViaWhatsApp: vi.fn(),
}));

// Translation mock
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'roomCode.linkCopied': 'Link copied!',
    'roomCode.copyLink': 'Copy Link',
    'share.copyLink': 'Copy Link',
    'share.invite': 'Invite',
    'share.inviteMessage': 'Join my LexiClash game!',
    'share.inviteTitle': 'Join LexiClash',
    'share.code': 'Code',
    'share.button': 'Share',
    'share.more': 'More',
    'share.modalTitle': 'Rally Your Squad',
    'common.error': 'Failed to copy',
    'common.copied': 'Copied!',
    'hostView.inviteFriends': 'Invite Friends',
    'roomCode.title': 'Room Code',
  };
  return translations[key] || key;
};

/** Helper: render and open the share dialog */
async function renderAndOpenDialog(gameCode: string, props?: Partial<React.ComponentProps<typeof MobileShareSection>>) {
  render(<MobileShareSection gameCode={gameCode} t={mockT} {...props} />);
  const trigger = screen.getByTestId('mobile-share-trigger');
  await act(async () => {
    fireEvent.click(trigger);
  });
}

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

    it('renders share trigger button', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} />);
      expect(screen.getByTestId('mobile-share-trigger')).toBeInTheDocument();
      expect(screen.getByText('Invite')).toBeInTheDocument();
    });

    it('styles the trigger as a brand-lime CTA in compact mode', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} compact />);
      const trigger = screen.getByTestId('mobile-share-trigger');
      expect(trigger.className).toContain('bg-neo-lime');
    });

    it('renders copy link and WhatsApp buttons inside dialog', async () => {
      await renderAndOpenDialog('TEST123');
      expect(screen.getByTestId('mobile-copy-link-button')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-whatsapp-button')).toBeInTheDocument();
    });

    it('renders hero image in dialog', async () => {
      await renderAndOpenDialog('TEST123');
      expect(screen.getByTestId('invite-hero-image')).toBeInTheDocument();
    });

    it('renders dialog title when opened', async () => {
      await renderAndOpenDialog('TEST123');
      expect(screen.getByText('Rally Your Squad')).toBeInTheDocument();
    });

    it('displays game code in dialog', async () => {
      await renderAndOpenDialog('ABC999');
      expect(screen.getByText('ABC999')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(<MobileShareSection gameCode="TEST123" t={mockT} className="custom-class" />);
      const section = screen.getByTestId('mobile-share-section');
      expect(section.className).toContain('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('copies link when copy button is clicked', async () => {
      const { copyJoinUrl } = await import('../../../../utils/share');
      await renderAndOpenDialog('COPY123');

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(copyJoinUrl).toHaveBeenCalledWith('COPY123', mockT, 'mobile-lobby');
    });

    it('copies link when room code area is tapped', async () => {
      const { copyJoinUrl } = await import('../../../../utils/share');
      await renderAndOpenDialog('COPY123');

      const codeCopy = screen.getByTestId('invite-code-copy');
      await act(async () => {
        fireEvent.click(codeCopy);
      });

      expect(copyJoinUrl).toHaveBeenCalledWith('COPY123', mockT, 'mobile-lobby');
    });

    it('shows Copied! text after successful copy', async () => {
      await renderAndOpenDialog('COPY123');

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('resets copied state after 2 seconds', async () => {
      await renderAndOpenDialog('COPY123');

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
      const { copyJoinUrl } = await import('../../../../utils/share');
      (copyJoinUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      await renderAndOpenDialog('FAIL123');

      const copyButton = screen.getByTestId('mobile-copy-link-button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });
  });

  describe('social share buttons', () => {
    it('calls shareViaWhatsApp when WhatsApp button clicked', async () => {
      const { shareViaWhatsApp } = await import('../../../../utils/share');

      await renderAndOpenDialog('SOCIAL123');

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      await act(async () => {
        fireEvent.click(whatsappBtn);
      });

      expect(shareViaWhatsApp).toHaveBeenCalledWith('SOCIAL123', '', mockT);
    });

    it('WhatsApp button has brand-whatsapp background color', async () => {
      await renderAndOpenDialog('STYLE123');

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn.className).toContain('bg-brand-whatsapp');
    });
  });

  describe('dialog button styling', () => {
    it('copy button has rounded-neo shape', async () => {
      await renderAndOpenDialog('STYLE123');

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('rounded-neo');
    });

    it('copy button has h-12 height', async () => {
      await renderAndOpenDialog('STYLE123');

      const copyBtn = screen.getByTestId('mobile-copy-link-button');
      expect(copyBtn.className).toContain('h-12');
    });

    it('WhatsApp button has shadow-hard-sm styling', async () => {
      await renderAndOpenDialog('STYLE123');

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn.className).toContain('shadow-hard-sm');
    });

    it('WhatsApp button has border-2 border-neo-black styling', async () => {
      await renderAndOpenDialog('STYLE123');

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn.className).toContain('border-2');
      expect(whatsappBtn.className).toContain('border-neo-black');
    });
  });

  describe('accessibility', () => {
    it('WhatsApp button has proper aria-label', async () => {
      await renderAndOpenDialog('A11Y123');

      const whatsappBtn = screen.getByTestId('mobile-whatsapp-button');
      expect(whatsappBtn).toHaveAttribute('aria-label', 'Share via WhatsApp');
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
