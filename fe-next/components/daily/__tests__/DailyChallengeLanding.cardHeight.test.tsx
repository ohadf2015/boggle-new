/**
 * Test: Challenge card heights should fit content on mobile and match on desktop
 *
 * Issue: Cards have fixed min-height of 420px on mobile which is too tall
 * Expected: Cards should fit content on mobile, match height on desktop (flex)
 */

import { render, screen } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock hooks
jest.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseMove: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

jest.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: jest.fn(() => null),
}));

jest.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: jest.fn(() => 'test-fingerprint'),
}));

// Mock framer-motion to avoid animation delays
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    path: 'path',
  },
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LanguageProvider>{children}</LanguageProvider>
  </AuthProvider>
);

describe('DailyChallengeLanding - Card Height', () => {
  const mockProps = {
    onSelectWordHunt: jest.fn(),
    onSelectBuzz: jest.fn(),
    currentLanguage: 'en' as const,
  };

  beforeEach(() => {
    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(min-width: 640px)', // Default to desktop
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should NOT have fixed min-height on mobile (should fit content)', () => {
    // Mock mobile viewport
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query !== '(min-width: 640px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    const cards = screen.getAllByRole('button');

    // Cards should exist
    expect(cards.length).toBeGreaterThan(0);

    // Check that cards don't have fixed min-height on mobile
    // The bug is: min-h-[420px] on mobile is too tall
    cards.forEach(card => {
      const className = card.className;
      // Should NOT have min-h-[420px] without responsive prefix
      // If it has min-h-[420px], it should only be for sm: or larger
      if (className.includes('min-h-')) {
        // If min-h is present, it should be responsive (sm:min-h-) not base
        expect(className).not.toMatch(/\bmin-h-\[420px\]/);
      }
    });
  });

  it('should use flex layout on desktop for equal heights', () => {
    // Mock desktop viewport
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(min-width: 640px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { container } = render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    // Find the grid container
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();

    // Grid should have sm:grid-cols-2 for side-by-side layout
    expect(gridContainer?.className).toMatch(/sm:grid-cols-2/);
  });

  it('should maintain consistent card structure without forced height', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    const cards = screen.getAllByRole('button');

    // Both cards should exist
    expect(cards.length).toBe(2);

    // Cards should have flex-col layout to push button to bottom
    cards.forEach(card => {
      expect(card.className).toMatch(/flex-col/);
    });
  });
});
