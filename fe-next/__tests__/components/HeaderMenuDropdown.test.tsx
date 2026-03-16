import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeaderMenuDropdown from '@/components/HeaderMenuDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock contexts
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');

// Mock Next.js Link
jest.mock('next/link', () => {
    const MockLink = ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => {
        return <a href={href} onClick={onClick}>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return MockLink;
});

// Mock child components
jest.mock('@/components/auth/AuthButton', () => {
    return function MockAuthButton() {
        return <div data-testid="mock-auth-button">Auth Button</div>;
    };
});

jest.mock('@/components/MusicControls', () => {
    return function MockMusicControls() {
        return <div data-testid="mock-music-controls">Music Controls</div>;
    };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

describe('HeaderMenuDropdown', () => {
    const defaultAuthState = {
        // State
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      isTeacher: false,
        isGuest: true,
        profile: null,
        rankedProgress: null,
        loading: false,
        isSupabaseEnabled: false,

        // Computed
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,

        // Actions
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
    };

    const defaultLanguageState = {
        t: (key: string) => key,
        language: 'en' as const,
        setLanguage: jest.fn(),
        currentFlag: '🇺🇸',
        dir: 'ltr' as const,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue(defaultAuthState);
        mockUseLanguage.mockReturnValue(defaultLanguageState);
    });

    describe('Dropdown Toggle', () => {
        it('should render closed dropdown by default', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button', { name: /common.openMenu/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('aria-expanded', 'false');

            // Dropdown content should not be visible
            expect(screen.queryByText(/brain.nav.profile/i)).not.toBeInTheDocument();
        });

        it('should open dropdown when clicking the trigger button', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button', { name: /common.openMenu/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Dropdown content should be visible
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
        });

        it('should close dropdown when clicking trigger button again', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');

            // Open
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Close
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });

        it('should close dropdown when clicking outside', async () => {
            render(
                <div>
                    <HeaderMenuDropdown />
                    <div data-testid="outside">Outside</div>
                </div>
            );

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Click outside
            const outside = screen.getByTestId('outside');
            fireEvent.mouseDown(outside);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });

        it('should close dropdown on Escape key', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Press Escape
            fireEvent.keyDown(document, { key: 'Escape' });

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('Guest User (Not Authenticated)', () => {
        it('should show only public links for guest users', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Should NOT show authenticated-only items
            expect(screen.queryByText(/brain.nav.profile/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/landing.brainTraining/i)).not.toBeInTheDocument();

            // Should show public items
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
            expect(screen.getByTestId('mock-auth-button')).toBeInTheDocument();

            // Music controls are now in the header, NOT in the dropdown
            expect(screen.queryByTestId('mock-music-controls')).not.toBeInTheDocument();
        });
    });

    describe('Authenticated User', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                ...defaultAuthState,
                isAuthenticated: true,
                profile: {
                    id: 'user-123',
                    username: 'testuser',
                    total_xp: 100,
                    total_coins: 50,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            });
        });

        it('should show authenticated-only links', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Should show authenticated items
            expect(screen.getByText(/brain.nav.profile/i)).toBeInTheDocument();
            // Brain Training is temporarily disabled (wrapped in {false && ...})
            expect(screen.queryByText(/landing.brainTraining/i)).not.toBeInTheDocument();

            // Should still show public items
            expect(screen.getByText(/settings.accessibility/i)).toBeInTheDocument();
            expect(screen.getByText(/settings.title/i)).toBeInTheDocument();
        });

        it('should close dropdown when clicking a link', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Click on Profile link
            const profileLink = screen.getByText(/brain.nav.profile/i);
            fireEvent.click(profileLink);

            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('RTL Support', () => {
        it('should position dropdown on left side for Hebrew', async () => {
            mockUseLanguage.mockReturnValue({
                ...defaultLanguageState,
                language: 'he',
                dir: 'rtl',
            });

            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                // Find dropdown content by checking for a unique element
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('left-0');
            });
        });

        it('should position dropdown on right side for LTR languages', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('right-0');
            });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label');
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-haspopup', 'true');
        });

        it('should update aria-expanded when opening/closing', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');

            // Initial state
            expect(button).toHaveAttribute('aria-expanded', 'false');

            // Open
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'true');
            });

            // Close
            fireEvent.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });
    });

    describe('Neo-Brutalist Styling', () => {
        it('should apply Neo-Brutalist classes to trigger button', () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('border-3');
            expect(button).toHaveClass('rounded-neo');
            expect(button).toHaveClass('shadow-hard-sm');
        });

        it('should apply Neo-Brutalist classes to dropdown', async () => {
            render(<HeaderMenuDropdown />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                const dropdown = screen.getByText(/settings.accessibility/i).closest('div.absolute');
                expect(dropdown).toHaveClass('border-4');
                expect(dropdown).toHaveClass('rounded-neo-lg');
                expect(dropdown).toHaveClass('shadow-hard-xl');
            });
        });
    });
});
