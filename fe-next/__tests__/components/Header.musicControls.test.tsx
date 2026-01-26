import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { HapticsProvider } from '@/contexts/HapticsContext';
import { ThemeProvider } from '@/utils/ThemeContext';

/**
 * Test: Music controls should be available in header on both mobile and desktop
 *
 * Requirements:
 * 1. Music controls should appear in the desktop header (visible on sm+ screens)
 * 2. Music controls should appear in the mobile header (visible on < sm screens)
 * 3. Music controls should NOT appear in the mobile menu dropdown
 */

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
    }),
    usePathname: () => '/en',
}));

// Mock hooks
jest.mock('@/hooks/useUnclaimedGifts', () => ({
    useUnclaimedGifts: () => ({
        unclaimedCount: 0,
        gifts: [],
        refresh: jest.fn(),
        claimGift: jest.fn(),
    }),
}));

jest.mock('@/hooks/useSafeArea', () => ({
    useSafeArea: () => ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    }),
}));

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider>
        <LanguageProvider initialLanguage="en">
            <AuthProvider>
                <MusicProvider>
                    <SoundEffectsProvider>
                        <HapticsProvider>
                            {children}
                        </HapticsProvider>
                    </SoundEffectsProvider>
                </MusicProvider>
            </AuthProvider>
        </LanguageProvider>
    </ThemeProvider>
);

describe('Header - Music Controls Placement', () => {
    beforeEach(() => {
        // Clear any mocks
        jest.clearAllMocks();
    });

    describe('Desktop View (sm+ screens)', () => {
        it('should render music controls in the desktop header', () => {
            // Render with desktop viewport
            global.innerWidth = 1024;

            render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Music controls should be visible in the header
            // Look for the volume button (part of MusicControls)
            const volumeButtons = screen.getAllByRole('button', { name: /mute|unmute|sound/i });

            // Should find at least one volume button (in desktop header)
            expect(volumeButtons.length).toBeGreaterThanOrEqual(1);

            // Verify it's in the desktop controls section by checking parent structure
            const desktopControls = document.querySelector('.hidden.sm\\:flex');
            expect(desktopControls).toBeInTheDocument();
        });
    });

    describe('Mobile View (< sm screens)', () => {
        it('should render music controls in the mobile header (not in menu)', () => {
            // Render with mobile viewport
            global.innerWidth = 375;

            render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Music controls should be visible in both mobile and desktop sections
            // (desktop section is hidden via CSS but still rendered in DOM)
            const volumeButtons = screen.getAllByRole('button', { name: /mute|unmute|sound/i });

            // Should find two volume buttons (mobile header + desktop header hidden with CSS)
            expect(volumeButtons.length).toBe(2);

            // Verify one is in the mobile header section (sm:hidden - visible on mobile)
            const mobileControls = document.querySelector('.sm\\:hidden');
            expect(mobileControls).toBeInTheDocument();

            // Verify one of the volume buttons is in the mobile controls
            const mobileVolumeButton = volumeButtons.find(btn =>
                mobileControls?.contains(btn.parentElement)
            );
            expect(mobileVolumeButton).toBeDefined();

            // Verify one is in the desktop header section (hidden sm:flex - hidden on mobile)
            const desktopControls = document.querySelector('.hidden.sm\\:flex');
            expect(desktopControls).toBeInTheDocument();

            // Verify one of the volume buttons is in the desktop controls
            const desktopVolumeButton = volumeButtons.find(btn =>
                desktopControls?.contains(btn.parentElement)
            );
            expect(desktopVolumeButton).toBeDefined();
        });

        it('should NOT render music controls in the mobile menu dropdown', () => {
            // Render with mobile viewport
            global.innerWidth = 375;

            const { container } = render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Find the mobile menu buttons (there may be multiple due to hamburger + menu dropdown)
            const menuButtons = screen.getAllByRole('button', { name: /open menu|menu/i });

            // Find the hamburger menu button (in sm:hidden section)
            const mobileMenuSection = container.querySelector('.sm\\:hidden');
            const hamburgerButton = menuButtons.find(btn =>
                mobileMenuSection?.contains(btn)
            );

            expect(hamburgerButton).toBeDefined();
            hamburgerButton?.click();

            // Wait for menu to open - look for the slide-out pane
            const mobileMenu = container.querySelector('.fixed.top-0.bottom-0');

            // Music controls should NOT be inside the mobile menu
            // The mobile menu should NOT contain any volume button or music-related sections
            const menuVolumeButtons = mobileMenu?.querySelectorAll('button[aria-label*="mute"]');
            expect(menuVolumeButtons?.length || 0).toBe(0);

            // Verify no "Sound & Music" section exists
            const musicSectionText = mobileMenu?.textContent || '';
            expect(musicSectionText).not.toMatch(/sound.*music/i);
        });
    });

    describe('HeaderMenuDropdown', () => {
        it('should NOT include music controls in the desktop dropdown menu', () => {
            // Render with desktop viewport
            global.innerWidth = 1024;

            const { container } = render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Find the menu dropdown button in the desktop section (hidden sm:flex)
            const desktopControls = container.querySelector('.hidden.sm\\:flex');
            const desktopMenuButton = desktopControls?.querySelector('button[aria-expanded="false"]');
            expect(desktopMenuButton).toBeInTheDocument();

            // Click to open dropdown
            (desktopMenuButton as HTMLElement)?.click();

            // Music controls should NOT be in the dropdown anymore
            // (they're now in the header directly)
            const dropdownContent = container.querySelector('.absolute.top-full');

            // Verify no "Sound & Music" section exists in dropdown
            const dropdownText = dropdownContent?.textContent || '';
            expect(dropdownText).not.toMatch(/sound.*music/i);

            // Verify no volume buttons in the dropdown
            const dropdownVolumeButtons = dropdownContent?.querySelectorAll('button[aria-label*="mute"]');
            expect(dropdownVolumeButtons?.length || 0).toBe(0);
        });
    });
});
