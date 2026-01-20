import { render } from '@testing-library/react';
import Header from '../Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';

// Mock framer-motion to avoid animation issues
jest.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MusicControls and AuthButton
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

describe('Header Visual Consistency - Desktop Mode', () => {
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

    describe('Background Color Consistency', () => {
        it('should use consistent neutral background for all utility buttons (Profile, Settings)', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            // Profile button (User icon)
            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));

            // Settings button (Settings icon, not accessibility)
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');

            // Both should have the SAME neutral background
            expect(profileButton).toHaveClass('bg-neo-cream');
            expect(settingsButton).toHaveClass('bg-neo-cream');

            // No gradients or tinted backgrounds for utility buttons
            const profileClassList = Array.from(profileButton!.classList);
            const settingsClassList = Array.from(settingsButton!.classList);

            expect(profileClassList.some(cls => cls.includes('gradient'))).toBe(false);
            expect(settingsClassList.some(cls => cls.includes('gradient'))).toBe(false);
        });

        it('should NOT use gradients for standard utility buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            // Profile and Settings should NOT have gradients
            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');

            const profileHasGradient = Array.from(profileButton!.classList)
                .some(cls => cls.includes('gradient') || cls.includes('from-') || cls.includes('to-'));
            const settingsHasGradient = Array.from(settingsButton!.classList)
                .some(cls => cls.includes('gradient') || cls.includes('from-') || cls.includes('to-'));

            expect(profileHasGradient).toBe(false);
            expect(settingsHasGradient).toBe(false);
        });

        it('should use solid backgrounds (not gradients) for all buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
            const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');

            const allButtons = [profileButton, giftButton, a11yButton, settingsButton].filter(Boolean);

            // NO button should use gradients
            allButtons.forEach(button => {
                const hasGradient = Array.from(button!.classList)
                    .some(cls => cls.includes('gradient') || cls.includes('from-') || cls.includes('to-'));
                expect(hasGradient).toBe(false);
            });
        });
    });

    describe('Hover State Consistency', () => {
        it('should use consistent hover effects for all icon buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
                .find(btn => btn.querySelector('svg.lucide-user'));
            const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
            const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');
            const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
                .find(el => el.getAttribute('href') === '/en/settings');

            const buttons = [profileButton, giftButton, a11yButton, settingsButton].filter(Boolean);

            // All buttons should have Neo-Brutalist hover transform
            buttons.forEach(button => {
                const classList = Array.from(button!.classList);
                const hasHoverTransform = classList.some(cls =>
                    cls.includes('hover:translate-x') || cls.includes('hover:shadow')
                );
                expect(hasHoverTransform).toBe(true);
            });
        });
    });
});
