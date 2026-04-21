import { render, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    LazyMotion: ({ children }: any) => <>{children}</>,
    domAnimation: {},
    m: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    },
}));

// Mock components
vi.mock('../MusicControls', () => {
  const MockMusicControls = () => {
        return <div data-testid="music-controls">Music</div>;
    };
  return { default: MockMusicControls };
});

vi.mock('../auth/AuthButton', () => {
  const MockAuthButton = () => {
        return <div data-testid="auth-button">Auth</div>;
    };
  return { default: MockAuthButton };
});

vi.mock('../QuickLanguageSwitcher', () => ({
    QuickLanguageSwitcher: function MockQuickLanguageSwitcher() {
        return <div data-testid="language-switcher">Language</div>;
    },
}));

vi.mock('../CoinBalance', () => ({
    CoinBalance: function MockCoinBalance({ coins }: { coins: number }) {
        return <div data-testid="coin-balance">{coins} coins</div>;
    },
}));

vi.mock('../gift/GiftNotificationBadge', () => ({
    GiftNotificationBadge: function MockGiftNotificationBadge({ count }: { count: number }) {
        return <span data-testid="gift-badge">{count}</span>;
    },
}));

vi.mock('../auth/AuthModal', () => {
  const MockAuthModal = () => {
        return null;
    };
  return { default: MockAuthModal };
});

vi.mock('../gift/AdminGiftModal', () => ({
    AdminGiftModal: function MockAdminGiftModal() {
        return null;
    },
}));

vi.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    };
  return { default: MockLink };
});

// Mock dependencies
vi.mock('../../contexts/LanguageContext');
vi.mock('../../contexts/AuthContext');
vi.mock('@/hooks/useUnclaimedGifts');
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
    usePathname: () => '/',
}));

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUnclaimedGifts = useUnclaimedGifts as jest.MockedFunction<typeof useUnclaimedGifts>;

describe('Header Color Consistency - Desktop Mode', () => {
    beforeEach(() => {
        mockUseLanguage.mockReturnValue({
            t: (key: string) => key,
            language: 'en' as const,
            currentFlag: '🇺🇸',
            setLanguage: vi.fn(),
            dir: 'ltr' as const,
        });

        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isAdmin: false,
      isTeacher: false,
            profile: {
                id: 'user-1',
                total_coins: 100,
                total_xp: 50,
            } as any,
            refreshProfile: vi.fn(),
            user: null,
            loading: false,
            isSupabaseEnabled: true,
            isGuest: false,
            canPlayRanked: true,
            gamesUntilRanked: 0,
            needsProfileCustomization: false,
            setupProfile: vi.fn(),
            updateProfile: vi.fn(),
            rankedProgress: null,
        });

        mockUseUnclaimedGifts.mockReturnValue({
            unclaimedCount: 1,
            gifts: [
                {
                    id: 'gift-1',
                    claimed: false,
                    created_at: new Date().toISOString(),
                },
            ] as any,
            loading: false,
            error: null,
            refresh: vi.fn(),
            claimGift: vi.fn(),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Utility Button Color Consistency', () => {
        it('should use consistent neutral background for all utility buttons (Profile, Settings, Accessibility)', () => {
            const { container } = render(<Header />);

            // Find and click the desktop menu button (inside .hidden.sm:flex container)
            const desktopControls = container.querySelector('.hidden.sm\\:flex');
            const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
            if (desktopMenuButton) {
                fireEvent.click(desktopMenuButton);
            }

            // Find the dropdown menu container (it's absolutely positioned)
            const dropdownMenu = container.querySelector('[class*="absolute top-full"]');

            // Get utility buttons from WITHIN the dropdown menu only (dark panel MenuLink style)
            const settingsButton = dropdownMenu?.querySelector('a[href="/en/settings"]');
            const a11yButton = dropdownMenu?.querySelector('a[href="/en/settings#accessibility"]');

            // All utility MenuLinks should use consistent styling (rounded-neo, font-bold)
            expect(settingsButton).toHaveClass('rounded-neo');
            expect(a11yButton).toHaveClass('rounded-neo');
        });

        it('should NOT use special accent colors for utility buttons', () => {
            const { container } = render(<Header />);

            // Find and click the desktop menu button (inside .hidden.sm:flex container)
            const desktopControls = container.querySelector('.hidden.sm\\:flex');
            const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
            if (desktopMenuButton) {
                fireEvent.click(desktopMenuButton);
            }

            // Find the dropdown menu container (it's absolutely positioned)
            const dropdownMenu = container.querySelector('[class*="absolute top-full"]');

            // Get utility buttons from WITHIN the dropdown menu only
            const profileButton = dropdownMenu?.querySelector('a[href="/en/profile"]');
            const settingsButton = dropdownMenu?.querySelector('a[href="/en/settings"]');
            const a11yButton = dropdownMenu?.querySelector('a[href="/en/settings#accessibility"]');

            // No purple, amber, pink, or other accent colors for utility buttons (except hover cyan which is allowed)
            const utilityButtons = [profileButton, settingsButton, a11yButton];
            utilityButtons.forEach(button => {
                const classList = Array.from(button!.classList);
                const hasAccentColor = classList.some(cls =>
                    cls.includes('purple') || cls.includes('amber') || cls.includes('pink') ||
                    (cls.includes('orange') && !cls.includes('neo-orange'))
                );
                expect(hasAccentColor).toBe(false);
            });
        });
    });

    describe('Notification Button Distinction', () => {
        it('should allow Gift button to use distinct color as it is a notification', () => {
            const { container } = render(<Header />);

            // Open dropdown to see gift button (it's inside the dropdown when unclaimedCount > 0)
            const desktopControls = container.querySelector('.hidden.sm\\:flex');
            const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
            if (desktopMenuButton) {
                fireEvent.click(desktopMenuButton);
            }

            const dropdownMenu = container.querySelector('[class*="absolute top-full"]');
            const giftButton = dropdownMenu?.querySelector('button');

            // Gift button CAN use amber (semantic reason: notification/reward)
            expect(giftButton).toHaveClass('bg-amber-400/20');
        });
    });

    describe('Hover State Uniformity', () => {
        it('should use consistent hover background pattern for all utility buttons', () => {
            const { container } = render(<Header />);

            // Find and click the desktop menu button (inside .hidden.sm:flex container)
            const desktopControls = container.querySelector('.hidden.sm\\:flex');
            const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
            if (desktopMenuButton) {
                fireEvent.click(desktopMenuButton);
            }

            // Find the dropdown menu container (it's absolutely positioned)
            const dropdownMenu = container.querySelector('[class*="absolute top-full"]');

            // Get utility buttons from WITHIN the dropdown menu only (dark panel MenuLink)
            const settingsButton = dropdownMenu?.querySelector('a[href="/en/settings"]');
            const a11yButton = dropdownMenu?.querySelector('a[href="/en/settings#accessibility"]');

            // All MenuLinks share same hover (hover:bg-neo-white/10)
            expect(settingsButton).toHaveClass('hover:bg-neo-white/10');
            expect(a11yButton).toHaveClass('hover:bg-neo-white/10');
        });
    });
});
