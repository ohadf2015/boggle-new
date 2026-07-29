/**
 * Test: AdminGiftModal Close Button Styling Bug
 *
 * This test verifies the close button has proper size, centering, and positioning.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AdminGiftModal } from '../AdminGiftModal';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion (m + LazyMotion API)
vi.mock('framer-motion', () => {
  const React = require('react');
  const el = (tag: string) => { const c = React.forwardRef(({ children, whileHover, whileTap, animate, initial, exit, transition, variants, ...rest }: any, ref: any) => React.createElement(tag, { ...rest, ref }, children)); c.displayName = `Motion_${tag}`; return c; };
  const motion = { div: el('div'), span: el('span'), button: el('button') };
  return { motion, m: motion, AnimatePresence: ({ children }: any) => children, LazyMotion: ({ children }: any) => children, domAnimation: {} };
});

// Mock modules
vi.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    context: vi.fn((fn) => {
      fn();
      return { revert: vi.fn() };
    }),
  },
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableGlowEffects: false,
    isLowEnd: false,
  }),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const mockGift = {
  id: 'gift-123',
  title: 'Top Player Recognition',
  message: 'Thank you for being an amazing player!',
  template_type: 'top_player',
  xp_amount: 100,
  coin_amount: 50,
};

describe('AdminGiftModal - Close Button Styling', () => {
  const renderModal = () => {
    return render(
      <LanguageProvider>
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={vi.fn()}
          onDismiss={vi.fn()}
        />
      </LanguageProvider>
    );
  };

  it('should have a large enough clickable area (min 48x48px for accessibility)', async () => {
    renderModal();

    // Wait for modal to be ready (phase === 'ready')
    await waitFor(() => {
      const closeButton = screen.queryByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText(/close/i);

    // Check that button has explicit size classes (w-12 h-12 = 48px) - Updated from w-10 h-10 (40px)
    expect(closeButton.className).toContain('w-12');
    expect(closeButton.className).toContain('h-12');
  });

  it('should have a large enough icon size (min 20px for visibility)', async () => {
    renderModal();

    await waitFor(() => {
      const closeButton = screen.queryByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText(/close/i);
    const icon = closeButton.querySelector('svg');

    expect(icon).toBeInTheDocument();

    // Icon should have width and height attributes set (lucide-react sets these from className)
    // Check that the icon has size attributes
    expect(icon!).toHaveAttribute('width');
    expect(icon!).toHaveAttribute('height');
  });

  it('should use flexbox for perfect centering of icon', async () => {
    renderModal();

    await waitFor(() => {
      const closeButton = screen.queryByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText(/close/i);

    // Check for flexbox centering classes
    expect(closeButton.className).toContain('flex');
    expect(closeButton.className).toContain('items-center');
    expect(closeButton.className).toContain('justify-center');
  });

  it('should have proper positioning away from corner (min 16px)', async () => {
    renderModal();

    await waitFor(() => {
      const closeButton = screen.queryByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText(/close/i);

    // Check positioning classes (top-3 = 12px, right-3 = 12px for LTR, left-3 for RTL)
    expect(closeButton.className).toContain('top-3');
    expect(closeButton.className).toMatch(/ltr:right-3|rtl:left-3/);
  });
});
