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

jest.mock('@/components/layout/GlobalBottomNav', () => ({
    __esModule: true,
    GlobalBottomNav: () => null,
}));

jest.mock('../../providers', () => ({
    Providers: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../fonts', () => ({
    fredoka: { variable: 'fredoka-var' },
    rubik: { variable: 'rubik-var' },
}));

describe('LocaleLayout Hydration', () => {
    it('should render without hydration mismatch', async () => {
        const LocaleLayout = (await import('../layout')).default;

        // Spy on console.error to catch React hydration warnings
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        const params = Promise.resolve({ locale: 'en' });
        const { container } = render(
            await LocaleLayout({
                children: <div>Test Content</div>,
                params,
            })
        );

        // Verify content is rendered
        expect(container.textContent).toContain('Test Content');

        // Verify no AdSense script is present (was removed for policy compliance)
        const scripts = document.querySelectorAll('script');
        const adsenseScript = Array.from(scripts).find(s =>
            s.getAttribute('src')?.includes('adsbygoogle.js')
        );
        expect(adsenseScript).toBeUndefined();

        // Check for hydration errors
        const hydrationErrors = consoleError.mock.calls.filter(call =>
            call[0]?.toString().includes('Hydration') ||
            call[0]?.toString().includes('did not match')
        );

        expect(hydrationErrors.length).toBe(0);

        consoleError.mockRestore();
    });

});
