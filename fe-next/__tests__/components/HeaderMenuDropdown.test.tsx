import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeaderMenuDropdown from '@/components/HeaderMenuDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock framer-motion (m + LazyMotion API)
vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  const motion = {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(props)}>{children}</div>,
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...strip(props)}>{children}</span>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...strip(props)}>{children}</button>,
    nav: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <nav {...strip(props)}>{children}</nav>,
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <ul {...strip(props)}>{children}</ul>,
    li: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <li {...strip(props)}>{children}</li>,
    a: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...strip(props)}>{children}</a>,
  };
  return { motion, m: motion, AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>, LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>, domAnimation: {} };
});

// Mock contexts
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');

// Mock new hooks used by HeaderMenuDropdown
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
vi.mock('@/components/CoinBalance', () => ({
    CoinBalance: function MockCoinBalance() { return <div data-testid="mock-coin-balance" />; },
}));
vi.mock('@/components/gift/GiftNotificationBadge', () => ({
    GiftNotificationBadge: function MockGiftBadge({ count }: { count: number }) { return <span>{count}</span>; },
}));
vi.mock('@/components/notifications/NotificationBell', () => ({
    NotificationBell: function MockNotificationBell() { return <div data-testid="mock-notification-bell" />; },
}));
vi.mock('@/components/QuickLanguageSwitcher', () => ({
    QuickLanguageSwitcher: function MockQuickLanguageSwitcher() { return <div data-testid="mock-language-switcher" />; },
}));
vi.mock('@/utils/profileStorage', () => ({
    getStoredCustomAvatar: () => null,
    getStoredUsername: () => '',
    setStoredUsername: vi.fn(),
}));

// Mock Next.js Link
vi.mock('next/link', () => {
    const MockLink = ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => {
        return <a href={href} onClick={onClick}>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return { default: MockLink };
});

// Mock child components
vi.mock('@/components/auth/AuthButton', () => ({
  default: function MockAuthButton() {
        return <div data-testid="mock-auth-button">Auth Button</div>;
    },
}));

vi.mock('@/components/MusicControls', () => ({
  default: function MockMusicControls() {
        return <div data-testid="mock-music-controls">Music Controls</div>;
    },
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;

describe('HeaderMenuDropdown', () => {
    const defaultAuthState = {
        // State
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      isTeacher: false,
        isGuest: true,
        profile: null,
        rankedProgress: null,
        loading: false,
        isSupabaseEnabled: false,

        // Computed
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,

        // Actions
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
    };

    const defaultLanguageState = {
        t: (key: string) => key,
        language: 'en' as const,
        setLanguage: vi.fn(),
        currentFlag: '🇺🇸',
        dir: 'ltr' as const,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mockUseAuth.mockReturnValue(defaultAuthState);
        mockUseLanguage.mockReturnValue(defaultLanguageState);
    });

    describe('Dropdown Toggle', () => {
        it('should render closed dropdown by default', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button', { name: /common.openMenu/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('aria-expanded', 'false');

            // Dropdown content should not be visible
            expect(screen.queryByText(/settings.accessibility/i)).not.toBeInTheDocument();
        });

        it('should open dropdown when clicking the trigger button', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button', { name: /common.openMenu/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Dropdown content should be visible
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
        });

        it('should close dropdown when clicking trigger button again', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');

            // Open
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Close
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });

        it('should close dropdown when clicking outside', async () => {
            render(
                <div>
                    <HeaderMenuDropdown />
                    <div data-testid="outside">Outside</div>
                </div>
            );

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Click outside
            const outside = screen.getByTestId('outside');
            fireEvent.mouseDown(outside);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });

        it('should close dropdown on Escape key', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Press Escape
            fireEvent.keyDown(document, { key: 'Escape' });

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('Guest User (Not Authenticated)', () => {
        it('should show only public links for guest users', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Should NOT show authenticated-only items (profile hero link with username not shown for guests)
            expect(screen.queryByRole('link', { name: /testuser/i })).not.toBeInTheDocument();
            expect(screen.queryByText(/landing.brainTraining/i)).not.toBeInTheDocument();

            // Should show public items
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
            expect(screen.getByTestId('mock-auth-button')).toBeInTheDocument();

            // Music controls are now inside the dropdown settings section
            expect(screen.getByTestId('mock-music-controls')).toBeInTheDocument();
        });
    });

    describe('Authenticated User', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                ...defaultAuthState,
                isAuthenticated: true,
                profile: {
                    id: 'user-123',
                    username: 'testuser',
                    total_xp: 100,
                    total_coins: 50,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            });
        });

        it('should show authenticated-only links', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Should show profile hero link with username (not a translation key)
            const profileLink = screen.getByRole('link', { name: /testuser/i });
            expect(profileLink).toBeInTheDocument();

            // Brain Training is temporarily disabled (wrapped in {false && ...})
            expect(screen.queryByText(/landing.brainTraining/i)).not.toBeInTheDocument();

            // Should still show public items
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
        });

        it('should close dropdown when clicking a link', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Click on Profile link (hero section has username as link text)
            const profileLink = screen.getByRole('link', { name: /testuser/i });
            fireEvent.click(profileLink);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('RTL Support', () => {
        it('should position dropdown on left side for Hebrew', async () => {
            mockUseLanguage.mockReturnValue({
                ...defaultLanguageState,
                language: 'he',
                dir: 'rtl',
            });

            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                // Find dropdown content by checking for a unique element
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('left-0');
            });
        });

        it('should position dropdown on right side for LTR languages', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('right-0');
            });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label');
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-haspopup', 'true');
        });

        it('should update aria-expanded when opening/closing', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');

            // Initial state
            expect(button).toHaveAttribute('aria-expanded', 'false');

            // Open
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Close
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('Badge Persistence (localStorage)', () => {
        const STORAGE_KEY = 'headerMenu.lastSeenBadgeCount';

        it('shows badge when unclaimed gifts exist and nothing has been seen yet', () => {
            render(<HeaderMenuDropdown unclaimedCount={3} />);

            // The aggregate badge on the closed trigger shows the count.
            const button = screen.getByRole('button', { name: /common.openMenu/i });
            expect(button).toHaveTextContent('3');
        });

        it('persists the seen count in localStorage when the menu is opened', async () => {
            render(<HeaderMenuDropdown unclaimedCount={3} />);

            const button = screen.getByRole('button', { name: /common.openMenu/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            expect(window.localStorage.getItem(STORAGE_KEY)).toBe('3');
        });

        it('keeps the badge hidden after "refresh" (remount) once it has been seen', async () => {
            const { unmount } = render(<HeaderMenuDropdown unclaimedCount={3} />);

            // Open the menu → marks count=3 as seen.
            fireEvent.click(screen.getByRole('button', { name: /common.openMenu/i }));
            await waitFor(() => {
                expect(window.localStorage.getItem(STORAGE_KEY)).toBe('3');
            });

            // Simulate a full page refresh by unmounting and re-rendering.
            unmount();
            render(<HeaderMenuDropdown unclaimedCount={3} />);

            // Badge span renders `{badgeCount}` text; with badgeSeen=true on fresh mount,
            // the badge should not appear. The trigger button should not contain the count.
            const freshButton = screen.getByRole('button', { name: /common.openMenu/i });
            expect(freshButton).not.toHaveTextContent('3');
        });

        it('resurfaces the badge when the count grows beyond the last seen value', async () => {
            // Seed localStorage as if the user had previously seen 3 items.
            window.localStorage.setItem(STORAGE_KEY, '3');

            render(<HeaderMenuDropdown unclaimedCount={5} />);

            // 5 > 3 → badge should appear with the new total.
            const button = screen.getByRole('button', { name: /common.openMenu/i });
            expect(button).toHaveTextContent('5');
        });

        it('clamps the stored marker when the live count drops below it', async () => {
            // User previously saw 5 items.
            window.localStorage.setItem(STORAGE_KEY, '5');

            // Now only 2 remain (e.g. user dismissed some elsewhere).
            render(<HeaderMenuDropdown unclaimedCount={2} />);

            // Effect should clamp stored marker to the current count so a future
            // increase back to 3 will correctly resurface the badge.
            await waitFor(() => {
                expect(window.localStorage.getItem(STORAGE_KEY)).toBe('2');
            });
        });
    });

    describe('Neo-Brutalist Styling', () => {
        it('should apply Neo-Brutalist classes to trigger button', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('border-3');
            expect(button).toHaveClass('rounded-neo');
            expect(button).toHaveClass('shadow-hard-sm');
        });

        it('should apply Neo-Brutalist classes to dropdown', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('border-4');
                expect(dropdown).toHaveClass('rounded-neo-lg');
                expect(dropdown).toHaveClass('shadow-hard-xl');
            });
        });
    });
});
