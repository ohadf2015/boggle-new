import { render } from '@testing-library/react';
import Header from '../Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock components
jest.mock('../MusicControls', () => {
    return function MockMusicControls() {
        return <div data-testid="music-controls">Music</div>;
    };
});

jest.mock('../auth/AuthButton', () => {
    return function MockAuthButton() {
        return <div data-testid="auth-button">Auth</div>;
    };
});

jest.mock('../QuickLanguageSwitcher', () => ({
    QuickLanguageSwitcher: function MockQuickLanguageSwitcher() {
        return <div data-testid="language-switcher">Language</div>;
    },
}));

jest.mock('../CoinBalance', () => ({
    CoinBalance: function MockCoinBalance({ coins }: { coins: number }) {
        return <div data-testid="coin-balance">{coins} coins</div>;
    },
}));

jest.mock('../gift/GiftNotificationBadge', () => ({
    GiftNotificationBadge: function MockGiftNotificationBadge({ count }: { count: number }) {
        return <span data-testid="gift-badge">{count}</span>;
    },
}));

jest.mock('../auth/AuthModal', () => {
    return function MockAuthModal() {
        return null;
    };
});

jest.mock('../gift/AdminGiftModal', () => ({
    AdminGiftModal: function MockAdminGiftModal() {
        return null;
    },
}));

jest.mock('next/link', () => {
    return function MockLink({ children, href, ...props }: any) {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    };
});

// Mock dependencies
jest.mock('../../contexts/LanguageContext');
jest.mock('../../contexts/AuthContext');
jest.mock('@/hooks/useUnclaimedGifts');
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
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
            setLanguage: jest.fn(),
            dir: 'ltr' as const,
        });

        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isAdmin: false,
            profile: {
                id: 'user-1',
                total_coins: 100,
                total_xp: 50,
            } as any,
            refreshProfile: jest.fn(),
            user: null,
            loading: false,
            isSupabaseEnabled: true,
            isGuest: false,
            canPlayRanked: true,
            gamesUntilRanked: 0,
            needsProfileCustomization: false,
            setupProfile: jest.fn(),
            updateProfile: jest.fn(),
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
            refresh: jest.fn(),
            claimGift: jest.fn(),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Utility Button Color Consistency', () => {
        it('should use consistent neutral background for all utility buttons (Profile, Settings, Accessibility)', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            // Get utility buttons (non-notification buttons)
            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');
            const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');

            // All utility buttons should have the SAME neutral background
            expect(profileButton).toHaveClass('bg-neo-cream');
            expect(settingsButton).toHaveClass('bg-neo-cream');
            expect(a11yButton).toHaveClass('bg-neo-cream');
        });

        it('should NOT use special accent colors for utility buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');
            const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');

            // No purple, amber, pink, or other accent colors for utility buttons
            const utilityButtons = [profileButton, settingsButton, a11yButton];
            utilityButtons.forEach(button => {
                const classList = Array.from(button!.classList);
                const hasAccentColor = classList.some(cls =>
                    cls.includes('purple') || cls.includes('amber') || cls.includes('pink') ||
                    cls.includes('cyan') && !cls.includes('hover:bg-neo-cyan')
                );
                expect(hasAccentColor).toBe(false);
            });
        });
    });

    describe('Notification Button Distinction', () => {
        it('should allow Gift button to use distinct color as it is a notification', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');

            // Gift button CAN use amber (semantic reason: notification/reward)
            expect(giftButton).toHaveClass('bg-amber-400');
        });
    });

    describe('Hover State Uniformity', () => {
        it('should use consistent hover background pattern for all utility buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');
            const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');

            // All should have the same hover background (neo-cyan/30)
            expect(profileButton).toHaveClass('hover:bg-neo-cyan/30');
            expect(settingsButton).toHaveClass('hover:bg-neo-cyan/30');
            expect(a11yButton).toHaveClass('hover:bg-neo-cyan/30');
        });
    });
});
