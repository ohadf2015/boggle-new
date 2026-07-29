import { render } from '@testing-library/react';
import Header from '../Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
    m: {
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

// Mock MusicControls and AuthButton
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

describe('Header Visual Consistency - Desktop Mode', () => {
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

    describe('Background Color Consistency', () => {
        it('should use consistent styling for utility buttons in desktop controls', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            // Desktop controls now have: Coin Balance link, Gift button, Language Switcher, Menu
            // Note: Profile link with coin balance doesn't have bg-neo-cream class
            // Settings has been moved to the unified side drawer

            // Test that desktop controls exist and contain expected elements
            expect(desktopControls).toBeInTheDocument();

            // Gift button should have consistent styling
            const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
            if (giftButton) {
                const classList = Array.from(giftButton.classList);
                // Gift button uses amber-400, not neo-cream, which is intentional for visual emphasis
                expect(classList).toContain('bg-amber-400');
            }
        });

        it('should NOT use gradients for standard utility buttons', () => {
            const { container } = render(<Header />);
            const desktopControls = container.querySelector('.hidden.sm\\:flex');

            // Gift button should NOT have gradients (uses solid bg-amber-400)
            // Note: Settings has been moved to the unified side drawer
            const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');

            if (giftButton) {
                const hasGradient = Array.from(giftButton.classList)
                    .some(cls => cls.includes('gradient') || cls.includes('from-') || cls.includes('to-'));

                expect(hasGradient).toBe(false);
            }
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
