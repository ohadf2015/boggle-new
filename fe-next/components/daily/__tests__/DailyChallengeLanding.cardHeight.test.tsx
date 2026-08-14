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
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock Image component
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock hooks
vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: vi.fn(() => null),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

// Mock framer-motion to avoid animation delays
vi.mock('framer-motion', () => ({
  m: {
    a: ({ children, className, style, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    path: 'path',
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock fetch for API calls
global.fetch = vi.fn((url: string) => {
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
    onSelectWordHunt: vi.fn(),
    onSelectWordWheel: vi.fn(),
    currentLanguage: 'en' as const,
  };

  it('should render word hunt quest card', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
  });

  it('should NOT have fixed min-height on quest card', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');

    // Cards should not have fixed min-height
    expect(wordHuntCard.className).not.toMatch(/\bmin-h-\[420px\]/);
  });
});
