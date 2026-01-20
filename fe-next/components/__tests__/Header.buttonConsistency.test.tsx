import { render, screen } from '@testing-library/react';
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

describe('Header Button Consistency', () => {
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

    it('should render all header buttons with consistent Neo-Brutalist styling', () => {
        const { container } = render(<Header />);

        // Get all icon buttons in desktop controls (excluding mobile hamburger and CoinBalance)
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        expect(desktopControls).toBeInTheDocument();

        // All icon buttons should have consistent border thickness (border-3 = 3px)
        // Profile button (with User icon), Gift button, Accessibility link, Settings link
        const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
            .find(btn => btn.querySelector('svg.lucide-user'));
        const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
        const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');
        const settingsLink = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
            .find(el => el.getAttribute('href') === '/en/settings');

        const iconButtons = [profileButton, giftButton, a11yButton, settingsLink].filter(Boolean);

        iconButtons.forEach(button => {
            // Check for consistent border width (border-3 = Neo-Brutalist 3px border)
            const classList = Array.from(button!.classList);
            const hasBorder3 = classList.includes('border-3');
            expect(hasBorder3).toBe(true);
        });
    });

    it('should render profile button with neutral background', () => {
        const { container } = render(<Header />);

        // Get desktop controls section
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        // Find profile button specifically (not the CoinBalance link) - it has User icon
        const profileButtons = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || []);
        const profileButton = profileButtons.find(btn => btn.querySelector('svg.lucide-user'));

        expect(profileButton).toHaveClass('bg-neo-cream');
        expect(profileButton).toHaveClass('border-3');
    });

    it('should render gift button with distinctive amber gradient', () => {
        const { container } = render(<Header />);

        // Get desktop controls section
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');

        expect(giftButton).toHaveClass('bg-gradient-to-br');
        expect(giftButton).toHaveClass('from-amber-400');
        expect(giftButton).toHaveClass('border-3');
    });

    it('should render accessibility button with purple accent', () => {
        const { container } = render(<Header />);

        // Get desktop controls section
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');

        expect(a11yButton).toHaveClass('bg-neo-purple/20');
        expect(a11yButton).toHaveClass('border-3');
    });

    it('should render settings button with neutral background', () => {
        const { container } = render(<Header />);

        // Get desktop controls section and find settings link (not the accessibility one)
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const settingsButton = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
            .find(el => el.getAttribute('href') === '/en/settings');

        expect(settingsButton).toHaveClass('bg-neo-cream');
        expect(settingsButton).toHaveClass('border-3');
    });

    it('should render all buttons with consistent size', () => {
        const { container } = render(<Header />);

        const desktopControls = container.querySelector('.hidden.sm\\:flex');

        // Get icon buttons specifically (not CoinBalance link)
        const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
            .find(btn => btn.querySelector('svg.lucide-user'));
        const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
        const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');
        const settingsLink = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
            .find(el => el.getAttribute('href') === '/en/settings');

        const iconButtons = [profileButton, giftButton, a11yButton, settingsLink].filter(Boolean);

        iconButtons.forEach(button => {
            const classList = Array.from(button!.classList);
            const hasConsistentSize = classList.includes('w-10') && classList.includes('h-10');
            expect(hasConsistentSize).toBe(true);
        });
    });

    it('should render all buttons with Neo-Brutalist shadow effects', () => {
        const { container } = render(<Header />);

        const desktopControls = container.querySelector('.hidden.sm\\:flex');

        // Get icon buttons specifically (not CoinBalance link)
        const profileButton = Array.from(desktopControls?.querySelectorAll('a[href*="profile"]') || [])
            .find(btn => btn.querySelector('svg.lucide-user'));
        const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');
        const a11yButton = desktopControls?.querySelector('a[href*="accessibility"]');
        const settingsLink = Array.from(desktopControls?.querySelectorAll('a[href*="settings"]') || [])
            .find(el => el.getAttribute('href') === '/en/settings');

        const iconButtons = [profileButton, giftButton, a11yButton, settingsLink].filter(Boolean);

        iconButtons.forEach(button => {
            const classList = Array.from(button!.classList);
            const hasShadow = classList.some(cls => cls.includes('shadow-hard'));
            expect(hasShadow).toBe(true);
        });
    });
});
