/**
 * Gift Modal Database Persistence Tests
 *
 * Tests for the bug fix where gift modal kept reappearing after page navigation
 * because dismissed gift state was only stored in component refs.
 *
 * Fix: Persist dismissal to database IMMEDIATELY when ANY gift is dismissed
 * by calling /api/player/gifts/dismiss-modal. The DB stores gift_modal_dismissed_at
 * timestamp, and the auto-show logic filters gifts by comparing created_at > dismissed_at.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  return { default: MockLink };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    currentFlag: '🇺🇸',
  }),
}));

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);

// Configurable mock values - can be changed per test
let mockProfile = {
  id: 'test-user',
  username: 'testuser',
  total_coins: 100,
  total_xp: 500,
  gift_modal_dismissed_at: null as string | null,
};

let mockGifts = [
  {
    id: 'gift-123',
    title: 'Test Gift',
    message: 'Test message',
    template_type: 'thank_you',
    xp_amount: 100,
    coin_amount: 50,
    claimed: false,
    claimed_at: null,
    created_at: new Date().toISOString(),
  },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: false,
    profile: mockProfile,
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock('@/hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({
    unclaimedCount: mockGifts.filter(g => !g.claimed).length,
    gifts: mockGifts,
    loading: false,
    error: null,
    refresh: vi.fn(),
    claimGift: vi.fn(),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <span {...props}>{children}</span>,
    nav: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <nav {...props}>{children}</nav>,
  },
}));

// Mock components that are not relevant to this test
vi.mock('@/components/auth/AuthButton', () => ({
  default: function MockAuthButton() {
    return <button>Auth</button>;
  },
}));

vi.mock('@/components/MusicControls', () => ({ default: function MockMusicControls() {
  return <button>Music</button>;
} }));

vi.mock('@/components/CoinBalance', () => ({
  CoinBalance: function MockCoinBalance() {
    return <span>100 coins</span>;
  },
}));

vi.mock('@/components/auth/AuthModal', () => ({
  default: function MockAuthModal() {
    return null;
  },
}));

vi.mock('@/components/gift/GiftNotificationBadge', () => ({
  GiftNotificationBadge: function MockBadge({ count }: { count: number }) {
    return <span data-testid="gift-badge">{count}</span>;
  },
}));

vi.mock('@/components/gift/AdminGiftModal', () => ({
  AdminGiftModal: function MockGiftModal({
    show,
    onDismiss,
  }: {
    show: boolean;
    onDismiss: () => void;
    gift: unknown;
    onClaim: () => void;
  }) {
    if (!show) return null;
    return (
      <div data-testid="gift-modal">
        <button data-testid="dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/QuickLanguageSwitcher', () => ({
  QuickLanguageSwitcher: function MockLanguageSwitcher() {
    return <button>Language</button>;
  },
}));

vi.mock('@/hooks/useEngagementStatus', () => ({
  useEngagementStatus: () => ({ streak: 0, level: 1, xp: 0 }),
}));

vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => ({ missions: [], completedCount: 0, isGrandSlam: false }),
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('@/components/Avatar', () => ({
  default: function MockAvatar() { return <div data-testid="mock-avatar" />; },
}));

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: function MockNotificationBell() { return null; },
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredCustomAvatar: () => null,
}));

// Import Header after mocks are set up
import Header from '../Header';

describe('Header - Gift Modal Database Persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockClear();
    mockRefreshProfile.mockClear();
    // Reset mock values to defaults
    mockProfile = {
      id: 'test-user',
      username: 'testuser',
      total_coins: 100,
      total_xp: 500,
      gift_modal_dismissed_at: null,
    };
    mockGifts = [
      {
        id: 'gift-123',
        title: 'Test Gift',
        message: 'Test message',
        template_type: 'thank_you',
        xp_amount: 100,
        coin_amount: 50,
        claimed: false,
        claimed_at: null,
        created_at: new Date().toISOString(),
      },
    ];
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, dismissedAt: new Date().toISOString() }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('database persistence on dismissal', () => {
    it('should call dismiss-modal API IMMEDIATELY when dismissing a gift', async () => {
      render(<Header />);

      // Wait for auto-show timer (3 seconds)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Modal should be shown
      await waitFor(() => {
        expect(screen.getByTestId('gift-modal')).toBeInTheDocument();
      });

      // Dismiss the modal
      fireEvent.click(screen.getByTestId('dismiss-btn'));

      // API should be called IMMEDIATELY (not waiting for all gifts to be dismissed)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/player/gifts/dismiss-modal', {
          method: 'POST',
        });
      });
    });

    it('should refresh profile after successful API call to get updated dismissed_at', async () => {
      render(<Header />);

      // Wait for auto-show timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('gift-modal')).toBeInTheDocument();
      });

      // Dismiss the modal
      fireEvent.click(screen.getByTestId('dismiss-btn'));

      // Wait for API call and profile refresh
      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });

    it('should NOT auto-show gift when profile.gift_modal_dismissed_at is newer than gift.created_at', async () => {
      // Set up: gift was created in the past, dismissal timestamp is in the future
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const futureDate = new Date(Date.now() + 10000).toISOString();

      // Update mock values BEFORE render
      mockProfile = {
        id: 'test-user',
        username: 'testuser',
        total_coins: 100,
        total_xp: 500,
        gift_modal_dismissed_at: futureDate, // Dismissed AFTER the gift was created
      };
      mockGifts = [
        {
          id: 'old-gift',
          title: 'Old Gift',
          message: 'Created before dismissal',
          template_type: 'thank_you',
          xp_amount: 100,
          coin_amount: 50,
          claimed: false,
          claimed_at: null,
          created_at: pastDate, // Created BEFORE dismissal
        },
      ];

      render(<Header />);

      // Wait for potential auto-show (should NOT happen)
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Modal should NOT be shown because gift was created before dismissal timestamp
      expect(screen.queryByTestId('gift-modal')).not.toBeInTheDocument();
    });

    it('should still show gift badge in dropdown when auto-show is dismissed', async () => {
      const { container } = render(<Header />);

      // Gift badge is now inside the HeaderMenuDropdown — open it first
      const desktopControls = container.querySelector('.hidden.sm\\:flex');
      const menuButton = desktopControls?.querySelector('button[aria-haspopup]') as HTMLElement | null;
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      // Gift badge should be visible inside the open dropdown
      await waitFor(() => {
        const badge = screen.getByTestId('gift-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('1');
      });
    });

    it('should auto-show gift when created AFTER the dismissal timestamp', async () => {
      // Set up: gift was created AFTER the dismissal timestamp
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const futureDate = new Date(Date.now() + 10000).toISOString();

      // Update mock values BEFORE render
      mockProfile = {
        id: 'test-user',
        username: 'testuser',
        total_coins: 100,
        total_xp: 500,
        gift_modal_dismissed_at: pastDate, // Dismissed in the past
      };
      mockGifts = [
        {
          id: 'new-gift',
          title: 'New Gift',
          message: 'Created after dismissal',
          template_type: 'thank_you',
          xp_amount: 100,
          coin_amount: 50,
          claimed: false,
          claimed_at: null,
          created_at: futureDate, // Created AFTER dismissal
        },
      ];

      render(<Header />);

      // Wait for auto-show timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Modal SHOULD be shown because gift was created after dismissal timestamp
      await waitFor(() => {
        expect(screen.getByTestId('gift-modal')).toBeInTheDocument();
      });
    });
  });
});
