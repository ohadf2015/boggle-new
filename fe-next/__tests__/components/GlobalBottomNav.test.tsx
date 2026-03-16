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
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
}));

jest.mock('../../contexts/LanguageContext', () => ({
    useLanguage: jest.fn(),
}));

jest.mock('../../contexts/NavigationContext', () => ({
    useNavigation: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../hooks/useSafeArea', () => ({
    useSafeArea: jest.fn(),
}));

jest.mock('../../utils/ThemeContext', () => ({
    useTheme: jest.fn(() => ({ theme: 'dark' })),
}));

jest.mock('../../components/auth/AuthModal', () => ({
    __esModule: true,
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
        isOpen ? <div data-testid="auth-modal" onClick={onClose}>AuthModal</div> : null
    ),
}));

describe('GlobalBottomNav', () => {
    const mockPush = jest.fn();
    const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
            'nav.bottomNavigation': 'Bottom navigation',
            'nav.home': 'Home',
            'nav.play': 'Play',
            'nav.leaderboard': 'Leaderboard',
            'nav.profile': 'Profile',
        };
        return translations[key] || key;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mocks
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (usePathname as jest.Mock).mockReturnValue('/en');
        (useLanguage as jest.Mock).mockReturnValue({
            t: mockT,
            language: 'en',
        });
        (useNavigation as jest.Mock).mockReturnValue({
            isInGame: false,
        });
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: true,
        });
        (useSafeArea as jest.Mock).mockReturnValue({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        });
    });

    describe('Rendering', () => {
        it('should render all three navigation tabs', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
        });

        it('should render with proper ARIA labels', () => {
            render(<GlobalBottomNav />);

            const nav = screen.getByRole('navigation');
            expect(nav).toHaveAttribute('aria-label', 'Bottom navigation');
        });

        it('should highlight active tab based on current path', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/profile');
            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            expect(profileButton).toHaveAttribute('aria-current', 'page');
        });

        it('should apply safe area padding when present', () => {
            (useSafeArea as jest.Mock).mockReturnValue({
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

        it('should navigate to profile when profile tab is clicked (authenticated)', () => {
            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            fireEvent.click(profileButton);

            expect(mockPush).toHaveBeenCalledWith('/en/profile');
        });

        it('should not navigate when profile is clicked but user is not authenticated (disabled)', () => {
            (useAuth as jest.Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            fireEvent.click(profileButton);

            // Button is disabled, so no navigation should occur
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('Active Tab Detection', () => {
        it('should mark home as active on root path', () => {
            (usePathname as jest.Mock).mockReturnValue('/en');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).toHaveAttribute('aria-current', 'page');
        });

        it('should mark profile as active on profile path', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/profile');
            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            expect(profileButton).toHaveAttribute('aria-current', 'page');
        });

        it('should default to home when path does not match any tab', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/some-other-page');
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            expect(homeButton).toHaveAttribute('aria-current', 'page');
        });
    });

    describe('Visibility Control', () => {
        it('should hide when user is in active game', () => {
            (useNavigation as jest.Mock).mockReturnValue({
                isInGame: true,
            });

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on multiplayer path (has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/multiplayer');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on singleplayer path (has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/singleplayer');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on daily path (has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/daily');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on adventure path (has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/adventure');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should remain visible on profile path (consistent navigation)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/profile');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
            expect(screen.getByLabelText(/profile/i)).toHaveAttribute('aria-current', 'page');
        });

        it('should remain visible on profile sub-paths (consistent navigation)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/profile/settings');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
            expect(screen.getByLabelText(/profile/i)).toHaveAttribute('aria-current', 'page');
        });

        it('should show on regular pages (settings, rules, etc.)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/settings');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });

        it('should hide on education path (education section has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/education');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on student path (education section has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/student');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on teacher path (education section has own nav)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/teacher');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on student sub-paths (e.g. /student/lessons)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/student/lessons');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });

        it('should hide on teacher sub-paths (e.g. /teacher/classroom)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/teacher/classroom');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Authentication State', () => {
        it('should show AuthModal when profile button clicked while not authenticated', async () => {
            (useAuth as jest.Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            expect(profileButton).not.toBeDisabled();

            fireEvent.click(profileButton);

            await waitFor(() => {
                expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
            });
        });

        it('should enable all buttons when authenticated', () => {
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            const profileButton = screen.getByRole('button', { name: /profile/i });

            expect(homeButton).not.toBeDisabled();
            expect(profileButton).not.toBeDisabled();
        });
    });

    describe('Internationalization', () => {
        it('should use Hebrew translations when language is Hebrew', () => {
            const hebrewT = jest.fn((key: string) => {
                const translations: Record<string, string> = {
                    'nav.home': 'בית',
                    'nav.play': 'שחק',
                    'nav.leaderboard': 'טבלת מובילים',
                    'nav.profile': 'פרופיל',
                };
                return translations[key] || key;
            });

            (useLanguage as jest.Mock).mockReturnValue({
                t: hebrewT,
                language: 'he',
            });
            (usePathname as jest.Mock).mockReturnValue('/he');

            render(<GlobalBottomNav />);

            expect(screen.getByText('בית')).toBeInTheDocument();
            expect(screen.getByText('שחק')).toBeInTheDocument();
            expect(screen.getByText('פרופיל')).toBeInTheDocument();
        });

        it('should navigate with correct language prefix', () => {
            (useLanguage as jest.Mock).mockReturnValue({
                t: mockT,
                language: 'sv',
            });
            (usePathname as jest.Mock).mockReturnValue('/sv');

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
            (usePathname as jest.Mock).mockReturnValue('/en/profile');
            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            const homeButton = screen.getByRole('button', { name: /home/i });

            expect(profileButton).toHaveAttribute('aria-current', 'page');
            expect(homeButton).not.toHaveAttribute('aria-current');
        });

        it('should have descriptive aria-labels', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
        });
    });

    describe('Neo-Brutalist Styling', () => {
        it('should apply hard shadow styling', () => {
            const { container } = render(<GlobalBottomNav />);
            const nav = container.querySelector('nav');

            expect(nav).toHaveClass('shadow-[0_-4px_0_0_rgba(0,0,0,1)]');
        });

        it('should apply solid neo-navy background', () => {
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
