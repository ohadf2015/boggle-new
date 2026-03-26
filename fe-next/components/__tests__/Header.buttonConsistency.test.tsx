import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
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

        // Open the dropdown menu
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
        if (desktopMenuButton) {
            fireEvent.click(desktopMenuButton);
        }

        // Find profile button inside the dropdown menu
        const dropdownMenu = container.querySelector('[class*="absolute top-full"]');
        const profileButton = dropdownMenu?.querySelector('a[href="/en/profile"]');

        expect(profileButton).toHaveClass('bg-neo-cream');
        expect(profileButton).toHaveClass('border-3');
    });

    it('should render gift button with distinctive amber background', () => {
        const { container } = render(<Header />);

        // Get desktop controls section
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const giftButton = desktopControls?.querySelector('button[aria-label*="gift"]');

        expect(giftButton).toHaveClass('bg-amber-400');
        expect(giftButton).toHaveClass('border-3');
    });

    it('should render accessibility button with neutral background', () => {
        const { container } = render(<Header />);

        // Open the dropdown menu
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
        if (desktopMenuButton) {
            fireEvent.click(desktopMenuButton);
        }

        // Find accessibility button inside the dropdown menu
        const dropdownMenu = container.querySelector('[class*="absolute top-full"]');
        const a11yButton = dropdownMenu?.querySelector('a[href="/en/settings#accessibility"]');

        expect(a11yButton).toHaveClass('bg-neo-cream');
        expect(a11yButton).toHaveClass('border-3');
    });

    it('should render settings button with neutral background', () => {
        const { container } = render(<Header />);

        // Open the dropdown menu
        const desktopControls = container.querySelector('.hidden.sm\\:flex');
        const desktopMenuButton = desktopControls?.querySelector('button[aria-label="common.openMenu"]');
        if (desktopMenuButton) {
            fireEvent.click(desktopMenuButton);
        }

        // Find settings button inside the dropdown menu
        const dropdownMenu = container.querySelector('[class*="absolute top-full"]');
        const settingsButton = dropdownMenu?.querySelector('a[href="/en/settings"]');

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
