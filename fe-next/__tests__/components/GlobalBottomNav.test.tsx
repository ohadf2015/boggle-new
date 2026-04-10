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
        it('should render all three navigation tabs', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /friends/i })).toBeInTheDocument();
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
            expect(nav).toHaveStyle({ paddingBottom: '34px' });
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

        it('should default to home when path does not match any tab', () => {
            (usePathname as Mock).mockReturnValue('/en/some-other-page');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).toHaveAttribute('aria-current', 'page');
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

        it('should hide on multiplayer path (has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/multiplayer');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on singleplayer path (has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/singleplayer');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on daily path (has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/daily');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on adventure path (has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/adventure');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
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

        it('should hide on education path (education section has own nav)', () => {
            (usePathname as Mock).mockReturnValue('/en/education');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
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
            expect(screen.getByText('שחק')).toBeInTheDocument();
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
            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
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
