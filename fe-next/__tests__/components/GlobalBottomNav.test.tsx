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
            'nav.brain': 'Brain',
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
        it('should render all four navigation tabs', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /brain/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
        });

        it('should render with proper ARIA labels', () => {
            render(<GlobalBottomNav />);

            const nav = screen.getByRole('navigation');
            expect(nav).toHaveAttribute('aria-label', 'Bottom navigation');
        });

        it('should highlight active tab based on current path', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/brain');
            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            expect(brainButton).toHaveAttribute('aria-current', 'page');
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

        it('should navigate to brain when brain tab is clicked (authenticated)', () => {
            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            fireEvent.click(brainButton);

            expect(mockPush).toHaveBeenCalledWith('/en/brain');
        });

        it('should navigate to profile when profile tab is clicked (authenticated)', () => {
            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            fireEvent.click(profileButton);

            expect(mockPush).toHaveBeenCalledWith('/en/profile');
        });

        it('should not navigate when brain is clicked but user is not authenticated (disabled)', () => {
            (useAuth as jest.Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            fireEvent.click(brainButton);

            // Button is disabled, so no navigation should occur
            expect(mockPush).not.toHaveBeenCalled();
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

        it('should mark brain as active on brain path', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/brain');
            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            expect(brainButton).toHaveAttribute('aria-current', 'page');
        });

        // Note: Profile tab is no longer testable for activation because
        // all /profile paths are now hidden (profile has its own MobileTabBar)
        // This is tested in the "Visibility Control" section instead

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

        it('should show on multiplayer lobby path (Play tab visible)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/multiplayer');

            const { container } = render(<GlobalBottomNav />);
            expect(container.firstChild).not.toBeNull();
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
            // GlobalBottomNav should remain visible to maintain consistent navigation
            expect(screen.getByRole('navigation')).toBeInTheDocument();
            expect(screen.getByLabelText(/profile/i)).toHaveAttribute('aria-current', 'page');
        });

        it('should remain visible on profile sub-paths (consistent navigation)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/profile/settings');

            render(<GlobalBottomNav />);
            // GlobalBottomNav should remain visible on all profile sub-paths
            expect(screen.getByRole('navigation')).toBeInTheDocument();
            expect(screen.getByLabelText(/profile/i)).toHaveAttribute('aria-current', 'page');
        });

        it('should show on regular pages (settings, rules, etc.)', () => {
            (usePathname as jest.Mock).mockReturnValue('/en/settings');

            render(<GlobalBottomNav />);
            expect(screen.getByRole('navigation')).toBeInTheDocument();
        });
    });

    describe('Authentication State', () => {
        it('should show AuthModal when brain button clicked while not authenticated', async () => {
            (useAuth as jest.Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            // Button should not be disabled
            expect(brainButton).not.toBeDisabled();

            // Click brain button
            fireEvent.click(brainButton);

            // AuthModal should appear
            await waitFor(() => {
                expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
            });
        });

        it('should show AuthModal when profile button clicked while not authenticated', async () => {
            (useAuth as jest.Mock).mockReturnValue({
                isAuthenticated: false,
            });

            render(<GlobalBottomNav />);

            const profileButton = screen.getByRole('button', { name: /profile/i });
            // Button should not be disabled
            expect(profileButton).not.toBeDisabled();

            // Click profile button
            fireEvent.click(profileButton);

            // AuthModal should appear
            await waitFor(() => {
                expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
            });
        });

        it('should enable all buttons when authenticated', () => {
            render(<GlobalBottomNav />);

            const homeButton = screen.getByRole('button', { name: /home/i });
            const brainButton = screen.getByRole('button', { name: /brain/i });
            const profileButton = screen.getByRole('button', { name: /profile/i });

            expect(homeButton).not.toBeDisabled();
            expect(brainButton).not.toBeDisabled();
            expect(profileButton).not.toBeDisabled();
        });
    });

    describe('Internationalization', () => {
        it('should use Hebrew translations when language is Hebrew', () => {
            const hebrewT = jest.fn((key: string) => {
                const translations: Record<string, string> = {
                    'nav.home': 'בית',
                    'nav.brain': 'מוח',
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
            expect(screen.getByText('מוח')).toBeInTheDocument();
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
            (usePathname as jest.Mock).mockReturnValue('/en/brain');
            render(<GlobalBottomNav />);

            const brainButton = screen.getByRole('button', { name: /brain/i });
            const homeButton = screen.getByRole('button', { name: /home/i });

            expect(brainButton).toHaveAttribute('aria-current', 'page');
            expect(homeButton).not.toHaveAttribute('aria-current');
        });

        it('should have descriptive aria-labels', () => {
            render(<GlobalBottomNav />);

            expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /brain/i })).toBeInTheDocument();
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

            // Solid background (no transparency) - matches neo-brutalist design
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
