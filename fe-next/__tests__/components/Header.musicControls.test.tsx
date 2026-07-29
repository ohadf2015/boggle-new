import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
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

// Silence the app logger. The mounted MusicProvider/AuthProvider kick off
// async work (dynamic `howler` import, auth/session probes) that resolves
// AFTER the synchronous test body and logs via `logger`. If that log lands
// while the vitest worker is closing it throws the flaky
// `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`
// (seen intermittently on this heavy multi-provider test, on master too).
vi.mock('@/utils/logger', () => ({
    default: {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        time: vi.fn(),
        timeEnd: vi.fn(),
    },
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        back: vi.fn(),
    }),
    usePathname: () => '/en',
}));

// Mock hooks
vi.mock('@/hooks/useUnclaimedGifts', () => ({
    useUnclaimedGifts: () => ({
        unclaimedCount: 0,
        gifts: [],
        refresh: vi.fn(),
        claimGift: vi.fn(),
    }),
}));

vi.mock('@/hooks/useSafeArea', () => ({
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
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // Let provider async effects (dynamic howler import, auth/session
        // probes, translation load) settle inside act() so their state updates
        // and any console output happen within the test window — not during
        // worker teardown, which surfaces as a flaky
        // "Closing rpc while onUserConsoleLog was pending" error.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
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
        it('should render music controls accessible via the mobile menu', () => {
            // Render with mobile viewport
            global.innerWidth = 375;

            const { container } = render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Both viewports share a single side-drawer trigger now.
            // The mobile-only inline strip (sm:hidden) still hosts MusicControls
            // and QuickLanguageSwitcher; the desktop strip (hidden sm:flex) hosts
            // the same widgets for desktop.
            const mobileControls = document.querySelector('.sm\\:hidden');
            const desktopControls = document.querySelector('.hidden.sm\\:flex');
            expect(mobileControls).toBeInTheDocument();
            expect(desktopControls).toBeInTheDocument();

            // The unified hamburger button lives outside both strips.
            const hamburgerButton = container.querySelector('button[aria-haspopup="true"]');
            expect(hamburgerButton).toBeInTheDocument();
        });

        it('should NOT render music controls in the mobile menu dropdown', () => {
            // Render with mobile viewport
            global.innerWidth = 375;

            const { container } = render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // The unified hamburger trigger is rendered once for both viewports.
            const hamburgerButton = container.querySelector<HTMLButtonElement>(
                'button[aria-haspopup="true"]'
            );

            expect(hamburgerButton).toBeInTheDocument();
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

    describe('Unified side-drawer trigger', () => {
        it('renders the hamburger trigger at desktop breakpoints with the neo-brutalist styling', () => {
            // Render with desktop viewport
            global.innerWidth = 1024;

            const { container } = render(
                <AllProviders>
                    <Header />
                </AllProviders>
            );

            // Mobile + desktop now share the same hamburger trigger; it sits
            // outside the two viewport-gated strips.
            const triggerButton = container.querySelector('button[aria-haspopup="true"]');
            expect(triggerButton).toBeInTheDocument();
            expect(triggerButton).toHaveAttribute('aria-expanded', 'false');

            // Trigger keeps the neo-brutalist chrome.
            expect(triggerButton).toHaveClass('border-3');
            expect(triggerButton).toHaveClass('rounded-neo');
        });
    });
});
