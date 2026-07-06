import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, usePathname } from 'next/navigation';
import GlobalBottomNav from '../../components/GlobalBottomNav';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeArea } from '../../hooks/useSafeArea';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../../contexts/LanguageContext', () => ({
    useLanguage: vi.fn(),
}));

vi.mock('../../contexts/NavigationContext', () => ({
    useNavigation: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../hooks/useSafeArea', () => ({
    useSafeArea: vi.fn(),
}));

const mockUseDailyMissions = vi.fn();
vi.mock('../../hooks/useDailyMissions', () => ({
    useDailyMissions: () => mockUseDailyMissions(),
}));

const mockUseFriends = vi.fn();
vi.mock('../../hooks/useFriends', () => ({
    useFriends: () => mockUseFriends(),
}));

const mockUseFriendMessages = vi.fn();
vi.mock('../../hooks/useFriendMessages', () => ({
    useFriendMessages: () => mockUseFriendMessages(),
}));

vi.mock('../../utils/ThemeContext', () => ({
    useTheme: vi.fn(() => ({ theme: 'dark' })),
}));

vi.mock('../../components/CrazyGamesSDK', () => ({
    useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('../../components/auth/AuthModal', () => ({
    __esModule: true,
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
        isOpen ? <div data-testid="auth-modal" onClick={onClose}>AuthModal</div> : null
    ),
}));

describe('GlobalBottomNav', () => {
    const mockPush = vi.fn();
    const mockT = vi.fn((key: string, params?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
            'nav.bottomNavigation': 'Bottom navigation',
            'nav.home': 'Home',
            'nav.play': 'Play',
            'nav.quests': 'Quests',
            'nav.leaderboard': 'Leaderboard',
            'nav.profile': 'Profile',
            'nav.friends': 'Friends',
            'nav.blog': 'Blog',
            'quests.progress': `${params?.completed ?? 0}/${params?.total ?? 0}`,
        };
        return translations[key] || key;
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        (useRouter as Mock).mockReturnValue({ push: mockPush });
        (usePathname as Mock).mockReturnValue('/en');
        (useLanguage as Mock).mockReturnValue({
            t: mockT,
            language: 'en',
        });
        (useNavigation as Mock).mockReturnValue({
            isInGame: false,
        });
        (useAuth as Mock).mockReturnValue({
            isAuthenticated: true,
        });
        (useSafeArea as Mock).mockReturnValue({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        });
        mockUseFriends.mockReturnValue({
            pendingRequests: [],
            friends: [],
            outgoingRequests: [],
            pendingChallenges: [],
            isLoading: false,
            error: null,
        });
        mockUseFriendMessages.mockReturnValue({
            unreadCount: 0,
            threads: [],
            messages: [],
            isLoadingThreads: false,
            isLoadingMessages: false,
            error: null,
        });
        mockUseDailyMissions.mockReturnValue({
            missions: [
                { type: 'wordHunt', completed: false, href: '/daily' },
                { type: 'adventure', completed: false, href: '/adventure' },
                { type: 'community', completed: false, href: '/multiplayer' },
            ],
            completedCount: 0,
            isGrandSlam: false,
            grandSlamClaimed: false,
            loading: false,
            refresh: vi.fn(),
        });
    });

    describe('Rendering', () => {
        it('should render the three base navigation tabs (quests, friends, home) on root path', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /quests/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /friends/i })).toBeInTheDocument();
            // Multiplayer is no longer a base tab — only surfaces on /multiplayer routes
            expect(screen.queryByRole('button', { name: /^play$/i })).not.toBeInTheDocument();
        });

        it('should render with proper ARIA labels', () => {
            render(<GlobalBottomNav />);

            const nav = screen.getByRole('navigation');
            expect(nav).toHaveAttribute('aria-label', 'Bottom navigation');
        });

        it('should highlight active tab based on current path', () => {
            (usePathname as Mock).mockReturnValue('/en/friends');
            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            expect(friendsButton).toHaveAttribute('aria-current', 'page');
        });

        it('should apply safe area padding when present', () => {
            (useSafeArea as Mock).mockReturnValue({
                top: 0,
                bottom: 34,
                left: 0,
                right: 0,
            });

            const { container } = render(<GlobalBottomNav />);
            const nav = container.querySelector('nav');
            // Nav stays flush at viewport bottom; AdMob banner lifts above it via
            // plugin margin (see AnchoredNativeBanner). Safe-area padding is internal.
            expect(nav).toHaveStyle({ paddingBottom: '34px' });
            expect(nav?.className).toContain('bottom-0');
        });

        it('should expose data-global-bottom-nav for the AdMob banner to measure', () => {
            const { container } = render(<GlobalBottomNav />);
            expect(container.querySelector('[data-global-bottom-nav]')).not.toBeNull();
        });

        it('should set has-global-bottom-nav class on html while visible', () => {
            const { unmount } = render(<GlobalBottomNav />);
            expect(document.documentElement.classList.contains('has-global-bottom-nav')).toBe(true);
            unmount();
            expect(document.documentElement.classList.contains('has-global-bottom-nav')).toBe(false);
        });

        it('should not set has-global-bottom-nav class when hidden (in game)', () => {
            (useNavigation as Mock).mockReturnValue({ isInGame: true });
            render(<GlobalBottomNav />);
            expect(document.documentElement.classList.contains('has-global-bottom-nav')).toBe(false);
        });
    });

    describe('Navigation', () => {
        it('should navigate to home when home tab is clicked', () => {
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            fireEvent.click(homeButton);

            expect(mockPush).toHaveBeenCalledWith('/en');
        });

        it('should navigate to friends when friends tab is clicked (authenticated)', () => {
            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            fireEvent.click(friendsButton);

            expect(mockPush).toHaveBeenCalledWith('/en/friends');
        });

        it('should not navigate when friends is clicked but user is not authenticated', () => {
            (useAuth as Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            fireEvent.click(friendsButton);

            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('Active Tab Detection', () => {
        it('should mark home as active on root path', () => {
            (usePathname as Mock).mockReturnValue('/en');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).toHaveAttribute('aria-current', 'page');
        });

        it('should mark friends as active on friends path', () => {
            (usePathname as Mock).mockReturnValue('/en/friends');
            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            expect(friendsButton).toHaveAttribute('aria-current', 'page');
        });

        it('should NOT mark home as active on unmapped, non-root paths', () => {
            // Regression: previously the fallback was 'home', which misled users on e.g. /settings
            (usePathname as Mock).mockReturnValue('/en/some-other-page');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).not.toHaveAttribute('aria-current', 'page');

            // No other tab should be active either
            const activeButtons = screen.queryAllByRole('button', { current: 'page' });
            expect(activeButtons).toHaveLength(0);
        });

        it('should NOT mark home as active on /adventure (dynamic route)', () => {
            (usePathname as Mock).mockReturnValue('/en/adventure');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).not.toHaveAttribute('aria-current', 'page');
        });
    });

    describe('Dynamic Contextual Tab', () => {
        const dynamicRoutes: Array<[string, RegExp]> = [
            ['/en/multiplayer', /play/i],
            ['/en/brain', /brain/i],
            ['/en/daily', /daily/i],
            ['/en/word-of-the-day', /daily/i],
            ['/en/blast', /blast/i],
            ['/en/leaderboard', /ranks|leaderboard/i],
            ['/en/profile', /profile/i],
            ['/en/settings', /settings/i],
            ['/en/community', /community/i],
            ['/en/referrals', /invite|referral/i],
            ['/en/singleplayer', /quick play|singleplayer/i],
        ];

        it.each(dynamicRoutes)('renders and activates a contextual tab on %s', (path, labelRe) => {
            (usePathname as Mock).mockReturnValue(path);
            render(<GlobalBottomNav />);

            const tab = screen.getByRole('button', { name: labelRe });
            expect(tab).toHaveAttribute('aria-current', 'page');
        });

        it('does not render a dynamic tab on unmapped routes (base 3 tabs only)', () => {
            (usePathname as Mock).mockReturnValue('/en/some-other-page');
            render(<GlobalBottomNav />);

            // Only the 3 base tabs: quests, friends, home
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(3);
        });

        it('does not render a dynamic tab when already on a base tab route', () => {
            (usePathname as Mock).mockReturnValue('/en/quests');
            render(<GlobalBottomNav />);

            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(3);
        });

        it('shows 4 tabs total when a dynamic route is active', () => {
            (usePathname as Mock).mockReturnValue('/en/brain');
            render(<GlobalBottomNav />);

            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(4);
        });

        it('clicking the dynamic tab does not push a new route (already on page)', () => {
            (usePathname as Mock).mockReturnValue('/en/brain');
            render(<GlobalBottomNav />);

            const dynamicBtn = screen.getByRole('button', { name: /brain/i });
            fireEvent.click(dynamicBtn);

            expect(mockPush).not.toHaveBeenCalled();
        });

        it('does not match /multiplayer dynamic on look-alike SEO slug /multiplayer-word-game-online', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer-word-game-online');
            render(<GlobalBottomNav />);

            // Multiplayer-themed SEO landing → Play tab (with targetPath
            // pointing back to the real /multiplayer route). Previously rendered
            // Blog, which led players into the friends-management page when they
            // tapped Friends looking for a way to "play with friends".
            const play = screen.getByRole('button', { name: /play/i });
            expect(play).toHaveAttribute('aria-current', 'page');
            expect(screen.queryByRole('button', { name: /blog/i })).not.toBeInTheDocument();
        });
    });

    describe('Multiplayer Tab Surfacing', () => {
        it('surfaces a Play tab and marks it active on /multiplayer', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer');
            render(<GlobalBottomNav />);

            const play = screen.getByRole('button', { name: /play/i });
            expect(play).toBeInTheDocument();
            expect(play).toHaveAttribute('aria-current', 'page');
        });

        it('surfaces Play tab on /multiplayer sub-routes (e.g. /multiplayer/lobby)', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer/lobby');
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
        });

        it('hides the Play tab on non-multiplayer routes', () => {
            (usePathname as Mock).mockReturnValue('/en/friends');
            render(<GlobalBottomNav />);

            expect(screen.queryByRole('button', { name: /^play$/i })).not.toBeInTheDocument();
        });
    });

    describe('Blog Tab on Editorial / Landing Surfaces', () => {
        const blogActiveRoutes = [
            '/en/blog',
            '/en/blog/boggle-vs-wordle',
            '/en/about',
            '/en/faq',
            '/en/glossary',
            '/en/guides',
            '/en/words',
            '/en/anagram',
            '/en/best-online-word-games',
            '/en/lexiclash-vs-popple',
        ];

        it.each(blogActiveRoutes)('renders Blog tab as active on %s', (path) => {
            const lang = path.split('/')[1];
            (useLanguage as Mock).mockReturnValue({ t: mockT, language: lang });
            (usePathname as Mock).mockReturnValue(path);
            render(<GlobalBottomNav />);

            const blog = screen.getByRole('button', { name: /blog/i });
            expect(blog).toHaveAttribute('aria-current', 'page');
        });

        it('does not surface Blog tab on game routes', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer');
            render(<GlobalBottomNav />);

            expect(screen.queryByRole('button', { name: /blog/i })).not.toBeInTheDocument();
        });
    });

    describe('Play Tab on Multiplayer-Themed SEO Landings', () => {
        // SEO landings whose user intent is clearly "play multiplayer" surface a
        // Play tab in the bottom nav (with `targetPath: /multiplayer`) so visitors
        // get a clear MP entry point. Without this, they tapped Friends and
        // landed on the friends-management page — the original bug this fixes.
        const mpLandingRoutes: Array<[string, string]> = [
            ['/en/multiplayer-word-game-online', 'en'],
            ['/en/online-word-games-with-friends', 'en'],
            ['/en/words-with-friends-alternative', 'en'],
            ['/he/hebrew-multiplayer-word-game', 'he'],
            ['/sv/swedish-multiplayer-word-game', 'sv'],
            ['/es/juego-de-palabras-multijugador', 'es'],
        ];

        it.each(mpLandingRoutes)('renders Play tab as active on %s', (path, lang) => {
            (useLanguage as Mock).mockReturnValue({ t: mockT, language: lang });
            (usePathname as Mock).mockReturnValue(path);
            render(<GlobalBottomNav />);

            const play = screen.getByRole('button', { name: /play/i });
            expect(play).toHaveAttribute('aria-current', 'page');
            expect(screen.queryByRole('button', { name: /blog/i })).not.toBeInTheDocument();
        });

        it('clicking Play tab on a MP landing routes to /multiplayer (not a no-op)', () => {
            (usePathname as Mock).mockReturnValue('/en/online-word-games-with-friends');
            render(<GlobalBottomNav />);

            fireEvent.click(screen.getByRole('button', { name: /play/i }));
            expect(mockPush).toHaveBeenCalledWith('/en/multiplayer');
        });
    });

    describe('Visibility Control', () => {
        it('should hide when user is in active game', () => {
            (useNavigation as Mock).mockReturnValue({
                isInGame: true,
            });

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should remain visible on multiplayer lobby (in-game state hides it, not the route)', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should remain visible on singleplayer lobby', () => {
            (usePathname as Mock).mockReturnValue('/en/singleplayer');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should remain visible on daily lobby', () => {
            (usePathname as Mock).mockReturnValue('/en/daily');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should remain visible on adventure lobby', () => {
            (usePathname as Mock).mockReturnValue('/en/adventure');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should remain visible on friends path (consistent navigation)', () => {
            (usePathname as Mock).mockReturnValue('/en/friends');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
            expect(screen.getByLabelText(/friends/i)).toHaveAttribute('aria-current', 'page');
        });

        it('should show on regular pages (settings, rules, etc.)', () => {
            (usePathname as Mock).mockReturnValue('/en/settings');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should remain visible on education path (general learning hub, not a dedicated app)', () => {
            (usePathname as Mock).mockReturnValue('/en/education');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should hide on student path (education section has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/student');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on teacher path (education section has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/teacher');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on student sub-paths (e.g. /student/lessons)', () => {
            (usePathname as Mock).mockReturnValue('/en/student/lessons');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on teacher sub-paths (e.g. /teacher/classroom)', () => {
            (usePathname as Mock).mockReturnValue('/en/teacher/classroom');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Tab Order', () => {
        it('should render home as the last (rightmost) tab so users always reach home on the right', () => {
            render(<GlobalBottomNav />);
            const buttons = screen.getAllByRole('button');
            const tabButtons = buttons.filter(b => b.getAttribute('aria-label'));
            const lastTab = tabButtons[tabButtons.length - 1];
            expect(lastTab).toHaveAttribute('aria-label', expect.stringMatching(/home/i));
        });

        it('should force dir="ltr" on the tab row so Home stays rightmost in RTL locales', () => {
            render(<GlobalBottomNav />);
            const nav = screen.getByRole('navigation');
            const row = nav.querySelector('[dir="ltr"]');
            expect(row).not.toBeNull();
        });
    });

    describe('Authentication State', () => {
        it('should show AuthModal when friends button clicked while not authenticated', async () => {
            (useAuth as Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            expect(friendsButton).not.toBeDisabled();

            fireEvent.click(friendsButton);

            await waitFor(() => {
                expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
            });
        });

        it('should enable all buttons when authenticated', () => {
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            const friendsButton = screen.getByRole('button', { name: /friends/i });

            expect(homeButton).not.toBeDisabled();
            expect(friendsButton).not.toBeDisabled();
        });
    });

    describe('Internationalization', () => {
        it('should use Hebrew translations when language is Hebrew', () => {
            const hebrewT = vi.fn((key: string) => {
                const translations: Record<string, string> = {
                    'nav.home': 'בית',
                    'nav.play': 'שחק',
                    'nav.quests': 'משימות',
                    'nav.leaderboard': 'טבלת מובילים',
                    'nav.friends': 'חברים',
                };
                return translations[key] || key;
            });

            (useLanguage as Mock).mockReturnValue({
                t: hebrewT,
                language: 'he',
            });
            (usePathname as Mock).mockReturnValue('/he');

            render(<GlobalBottomNav />);

            expect(screen.getByText('בית')).toBeInTheDocument();
            expect(screen.getByText('משימות')).toBeInTheDocument();
            expect(screen.getByText('חברים')).toBeInTheDocument();
        });

        it('should navigate with correct language prefix', () => {
            (useLanguage as Mock).mockReturnValue({
                t: mockT,
                language: 'sv',
            });
            (usePathname as Mock).mockReturnValue('/sv');

            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            fireEvent.click(homeButton);

            expect(mockPush).toHaveBeenCalledWith('/sv');
        });
    });

    describe('Accessibility', () => {
        it('should have proper WCAG touch target sizes (min 48x48px)', () => {
            render(<GlobalBottomNav />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).toHaveClass('min-w-[64px]');
                expect(button).toHaveClass('min-h-[48px]');
            });
        });

        it('should indicate active state for screen readers', () => {
            (usePathname as Mock).mockReturnValue('/en/friends');
            render(<GlobalBottomNav />);

            const friendsButton = screen.getByRole('button', { name: /friends/i });
            const homeButton = screen.getByRole('button', { name: /home/i });

            expect(friendsButton).toHaveAttribute('aria-current', 'page');
            expect(homeButton).not.toHaveAttribute('aria-current');
        });

        it('should have descriptive aria-labels', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /quests/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /friends/i })).toBeInTheDocument();
        });
    });

    describe('Quest Progress Badge', () => {
        it('should not show badge when no quests completed', () => {
            render(<GlobalBottomNav />);
            expect(screen.queryByTestId('quest-progress-badge')).not.toBeInTheDocument();
        });

        it('should show progress badge when some quests completed', () => {
            mockUseDailyMissions.mockReturnValue({
                missions: [
                    { type: 'wordHunt', completed: true, href: '/daily' },
                    { type: 'adventure', completed: false, href: '/adventure' },
                    { type: 'community', completed: true, href: '/multiplayer' },
                ],
                completedCount: 2,
                isGrandSlam: false,
                grandSlamClaimed: false,
                loading: false,
                refresh: vi.fn(),
            });

            render(<GlobalBottomNav />);
            const badge = screen.getByTestId('quest-progress-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('2');
        });

        it('should show full progress when all 3 quests completed', () => {
            mockUseDailyMissions.mockReturnValue({
                missions: [
                    { type: 'wordHunt', completed: true, href: '/daily' },
                    { type: 'adventure', completed: true, href: '/adventure' },
                    { type: 'community', completed: true, href: '/multiplayer' },
                ],
                completedCount: 3,
                isGrandSlam: true,
                grandSlamClaimed: false,
                loading: false,
                refresh: vi.fn(),
            });

            render(<GlobalBottomNav />);
            const badge = screen.getByTestId('quest-progress-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('3');
        });
    });

    describe('Social Badge (friends + unread messages)', () => {
        it('should not show badge when no pending requests and no unread messages', () => {
            render(<GlobalBottomNav />);
            expect(screen.queryByTestId('friend-social-badge')).not.toBeInTheDocument();
        });

        it('should show count equal to pending requests when no unread messages', () => {
            mockUseFriends.mockReturnValue({
                pendingRequests: [{ id: 'r1' }, { id: 'r2' }],
                friends: [], outgoingRequests: [], pendingChallenges: [],
                isLoading: false, error: null,
            });
            render(<GlobalBottomNav />);
            const badge = screen.getByTestId('friend-social-badge');
            expect(badge).toHaveTextContent('2');
        });

        it('should show combined count of pending requests plus unread messages', () => {
            mockUseFriends.mockReturnValue({
                pendingRequests: [{ id: 'r1' }],
                friends: [], outgoingRequests: [], pendingChallenges: [],
                isLoading: false, error: null,
            });
            mockUseFriendMessages.mockReturnValue({
                unreadCount: 3,
                threads: [], messages: [],
                isLoadingThreads: false, isLoadingMessages: false, error: null,
            });
            render(<GlobalBottomNav />);
            const badge = screen.getByTestId('friend-social-badge');
            expect(badge).toHaveTextContent('4');
        });

        it('should cap display at 9+ when combined count exceeds 9', () => {
            mockUseFriends.mockReturnValue({
                pendingRequests: [{ id: 'r1' }, { id: 'r2' }],
                friends: [], outgoingRequests: [], pendingChallenges: [],
                isLoading: false, error: null,
            });
            mockUseFriendMessages.mockReturnValue({
                unreadCount: 12,
                threads: [], messages: [],
                isLoadingThreads: false, isLoadingMessages: false, error: null,
            });
            render(<GlobalBottomNav />);
            const badge = screen.getByTestId('friend-social-badge');
            expect(badge).toHaveTextContent('9+');
        });
    });

    describe('Neo-Brutalist Styling', () => {
        it('should apply hard shadow styling', () => {
            const { container } = render(<GlobalBottomNav />);
            const nav = container.querySelector('nav');

            expect(nav).toHaveClass('shadow-[0_-4px_0_0_rgba(0,0,0,1)]');
        });

        it('should apply opaque neo-navy background', () => {
            const { container } = render(<GlobalBottomNav />);
            const nav = container.querySelector('nav');

            expect(nav).toHaveClass('bg-neo-navy');
        });

        it('should apply border styling', () => {
            const { container } = render(<GlobalBottomNav />);
            const nav = container.querySelector('nav');

            expect(nav).toHaveClass('border-t-3');
            expect(nav).toHaveClass('border-neo-black');
        });
    });
});
