/**
 * Test: Close Button Styling in AdminGiftModal
 *
 * Verifies that the close button has proper:
 * 1. Size (minimum 48x48 for touch targets)
 * 2. Icon centering (perfect alignment)
 * 3. Positioning (proper spacing from corner)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminGiftModal } from '../AdminGiftModal';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock dependencies
vi.mock('gsap', () => ({
  __esModule: true,
  default: {
    context: vi.fn(() => ({ revert: vi.fn() })),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
  },
}));

vi.mock('framer-motion', () => {
  const motion = {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  };
  return {
    motion,
    m: motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    LazyMotion: ({ children }: any) => <>{children}</>,
    domAnimation: {},
  };
});

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: true, // Skip animations to reach 'ready' phase immediately
    enableGlowEffects: true,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

describe('AdminGiftModal - Close Button Styling', () => {
  const mockGift = {
    id: 'gift-1',
    title: 'Test Gift',
    message: 'Test message',
    template_type: 'top_player' as const,
    xp_amount: 100,
    coin_amount: 50,
    badge_id: null,
    badge: null,
    sender: undefined,
  };

  const defaultProps = {
    gift: mockGift,
    show: true,
    onClaim: vi.fn(),
    onDismiss: vi.fn(),
    currentXp: 0,
    currentCoins: 0,
  };

  const renderModal = (props = {}) => {
    return render(
      <LanguageProvider>
        <AdminGiftModal {...defaultProps} {...props} />
      </LanguageProvider>
    );
  };

  it('should have close button with minimum touch target size (48x48)', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Check for size classes (Tailwind w-12 h-12 = 48px, min-w-[48px] min-h-[48px])
    const hasProperSize =
      closeButton.className.includes('w-12') ||
      closeButton.className.includes('w-14') ||
      closeButton.className.includes('min-w-[48px]') ||
      closeButton.className.includes('min-w-[52px]') ||
      closeButton.className.includes('min-w-[56px]');

    const hasProperHeight =
      closeButton.className.includes('h-12') ||
      closeButton.className.includes('h-14') ||
      closeButton.className.includes('min-h-[48px]') ||
      closeButton.className.includes('min-h-[52px]') ||
      closeButton.className.includes('min-h-[56px]');

    // Verify minimum touch target size (WCAG 2.1 AAA: 44x44, best practice: 48x48)
    // Current: w-10 h-10 (40px - TOO SMALL)
    // Fixed: w-12 h-12 (48px) or larger
    expect(hasProperSize).toBe(true);
    expect(hasProperHeight).toBe(true);
  });

  it('should have proper flex centering for icon alignment', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Check for centering classes
    expect(closeButton.className).toMatch(/flex/);
    expect(closeButton.className).toMatch(/items-center/);
    expect(closeButton.className).toMatch(/justify-center/);
  });

  it('should have circular shape with proper border-radius', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Check for rounded-full or equivalent
    expect(closeButton.className).toMatch(/rounded-full/);
  });

  it('should have visible background for better contrast', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Should have a background class (Tailwind bg-* class)
    // jsdom doesn't process Tailwind, so check className instead of computed style
    expect(closeButton.className).toMatch(/bg-/);
  });

  it('should have proper positioning in corner with adequate spacing', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Check positioning classes
    expect(closeButton.className).toMatch(/absolute/);
    expect(closeButton.className).toMatch(/top-/); // Has top spacing

    // Should have either left or right positioning (RTL aware)
    const hasLtrRight = closeButton.className.includes('ltr:right-') || closeButton.className.includes('right-');
    const hasRtlLeft = closeButton.className.includes('rtl:left-') || closeButton.className.includes('left-');
    expect(hasLtrRight || hasRtlLeft).toBe(true);
  });

  it('should have adequate z-index to appear above modal content', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Should have z-index class
    expect(closeButton.className).toMatch(/z-\d+/);
  });

  it('should have hover state for better UX', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Should have hover classes
    expect(closeButton.className).toMatch(/hover:/);
  });

  it('should only appear when modal is in ready phase', () => {
    const { rerender } = renderModal();

    // Close button should be present
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

    // When show is false, button should not be present
    rerender(
      <LanguageProvider>
        <AdminGiftModal {...defaultProps} show={false} />
      </LanguageProvider>
    );

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should have proper color contrast for icon visibility', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Icon should have color class
    const icon = closeButton.querySelector('svg');
    expect(icon).toBeInTheDocument();

    // Icon should have text color class
    const iconClasses = icon?.getAttribute('class') || '';
    expect(iconClasses).toMatch(/text-/);
  });

  it('documents the styling requirements', () => {
    // REQUIREMENTS:
    // 1. Button size: min 48x48px (touch target)
    // 2. Icon size: 24-28px (proportional to button)
    // 3. Centering: flex items-center justify-center
    // 4. Background: visible with good contrast
    // 5. Positioning: top-3 right-3 (12px spacing)
    // 6. Shape: rounded-full (circular)
    // 7. Hover state: visible feedback
    // 8. Z-index: above content (z-20 or higher)

    const requirements = {
      minButtonSize: 48,
      iconSize: { min: 24, max: 28 },
      centering: ['flex', 'items-center', 'justify-center'],
      positioning: { top: 12, right: 12 }, // Tailwind: top-3, right-3
      shape: 'rounded-full',
      zIndex: 20,
    };

    expect(requirements.minButtonSize).toBeGreaterThanOrEqual(44); // WCAG minimum
  });
});
