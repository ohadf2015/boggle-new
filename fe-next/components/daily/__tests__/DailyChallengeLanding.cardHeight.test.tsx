/**
 * Test: Challenge quest cards should render properly with vertical layout
 *
 * Updated for new vertical quest path layout (was grid-based).
 * Cards are now QuestCard components in a vertical stack.
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
  // eslint-disable-next-line @next/next/no-img-element
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
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

// Mock framer-motion to avoid animation delays
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    path: 'path',
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn((url: string) => {
  if (typeof url === 'string' && url.includes('daily-streak')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ streak: 0 }) });
  }
  if (typeof url === 'string' && url.includes('daily-challenge/leaderboard')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ available: true, data: { played: false } }),
  });
}) as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LanguageProvider>{children}</LanguageProvider>
  </AuthProvider>
);

describe('DailyChallengeLanding - Quest Card Layout', () => {
  const mockProps = {
    onSelectWordHunt: jest.fn(),
    onSelectBuzz: jest.fn(),
    currentLanguage: 'en' as const,
  };

  it('should render both quest cards in vertical layout', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    // Both quest cards should exist
    expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
    expect(screen.getByTestId('quest-card-buzz')).toBeInTheDocument();
  });

  it('should NOT have fixed min-height on quest cards', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');
    const buzzCard = screen.getByTestId('quest-card-buzz');

    // Cards should not have fixed min-height
    expect(wordHuntCard.className).not.toMatch(/\bmin-h-\[420px\]/);
    expect(buzzCard.className).not.toMatch(/\bmin-h-\[420px\]/);
  });

  it('should use vertical stack layout for quest cards (not grid)', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    // Both quest cards should be rendered vertically, not in a side-by-side grid
    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');
    const buzzCard = screen.getByTestId('quest-card-buzz');

    // Cards should NOT share a parent with grid-cols-2
    const wordHuntParent = wordHuntCard.parentElement;
    const buzzParent = buzzCard.parentElement;

    // If both share the same parent, that parent shouldn't have grid-cols-2
    if (wordHuntParent === buzzParent && wordHuntParent) {
      expect(wordHuntParent.className).not.toContain('grid-cols-2');
    }
  });
});
