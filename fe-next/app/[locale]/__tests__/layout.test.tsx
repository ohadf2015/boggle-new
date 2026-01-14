import { render } from '@testing-library/react';

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
        const Component = () => null;
        Component.displayName = 'DynamicComponent';
        return Component;
    },
}));

// Mock next/script - render as script tag for testing
jest.mock('next/script', () => ({
    __esModule: true,
    default: ({ src, strategy, crossOrigin, ...props }: any) => (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={src} data-strategy={strategy} crossOrigin={crossOrigin} {...props} />
    ),
}));

// Mock all child components
jest.mock('@/components/Footer', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/GoogleAnalytics', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/CrazyGamesSDK', () => ({
    CrazyGamesScript: () => null,
}));

jest.mock('@/components/SocialMediaPixels', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/WebVitalsReporter', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/PWAInstallPrompt', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/ServiceWorkerRegistration', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/components/celebration/NewYearCountdown', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('../../providers', () => ({
    Providers: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../fonts', () => ({
    fredoka: { variable: 'fredoka-var' },
    rubik: { variable: 'rubik-var' },
}));

describe('LocaleLayout Hydration', () => {
    it('should not cause hydration mismatch with AdSense script', async () => {
        const LocaleLayout = (await import('../layout')).default;

        // Spy on console.error to catch React hydration warnings
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        const params = Promise.resolve({ locale: 'en' });
        render(
            await LocaleLayout({
                children: <div>Test Content</div>,
                params,
            })
        );

        // Check that body contains script tags (Next.js Script renders in body)
        const scripts = document.querySelectorAll('script');

        // Verify AdSense script is present and properly configured
        const adsenseScript = Array.from(scripts).find(s =>
            s.getAttribute('src')?.includes('adsbygoogle.js')
        );

        expect(adsenseScript).toBeDefined();
        if (adsenseScript) {
            // Next.js Script component uses strategy, not defer attribute
            expect(adsenseScript.getAttribute('data-strategy')).toBe('afterInteractive');
            expect(adsenseScript.getAttribute('src')).toContain('adsbygoogle.js');
            expect(adsenseScript.getAttribute('crossOrigin')).toBe('anonymous');
        }

        // Check for hydration errors
        const hydrationErrors = consoleError.mock.calls.filter(call =>
            call[0]?.toString().includes('Hydration') ||
            call[0]?.toString().includes('did not match')
        );

        expect(hydrationErrors.length).toBe(0);

        consoleError.mockRestore();
    });

});
