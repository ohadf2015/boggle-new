import { vi, type Mock, } from 'vitest';
import { render } from '@testing-library/react';

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
        const Component = () => null;
        Component.displayName = 'DynamicComponent';
        return Component;
    },
}));

// Mock next/headers — the layout reads geo headers for the cold-start RUM beacon,
// and `headers()` throws "headers was called outside a request scope" when the
// component is rendered directly by a unit test instead of by the Next router.
// Empty headers is the realistic default: the beacon falls back to '' for country.
vi.mock('next/headers', () => ({
    __esModule: true,
    headers: async () => new Headers(),
}));

// Mock next/script - render as script tag for testing
vi.mock('next/script', () => ({
    __esModule: true,
    default: ({ src, strategy, crossOrigin, ...props }: any) => (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={src} data-strategy={strategy} crossOrigin={crossOrigin} {...props} />
    ),
}));

// Mock all child components
vi.mock('@/components/Footer', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/GoogleAnalytics', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/CrazyGamesScriptServer', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/SocialMediaPixels', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/WebVitalsReporter', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/PWAInstallPrompt', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/ServiceWorkerRegistration', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/celebration/NewYearCountdown', () => ({
    __esModule: true,
    default: () => null,
}));

// Mock the providers with minimal context
const mockLanguageContext = {
    t: (key: string) => key,
    language: 'en' as const,
    setLanguage: vi.fn(),
    dir: 'ltr' as const,
    currentFlag: '🇺🇸',
};

const mockNavigationContext = {
    shouldHideNav: false,
};

vi.mock('@/contexts/LanguageContext', () => ({
    LanguageContext: {
        Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
    useLanguage: () => mockLanguageContext,
}));

vi.mock('@/contexts/NavigationContext', () => ({
    NavigationContext: {
        Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
    useNavigation: () => mockNavigationContext,
}));

vi.mock('../../providers', () => ({
    Providers: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../fonts', () => ({
    fredoka: { variable: 'fredoka-var' },
    rubik: { variable: 'rubik-var' },
    fredokaLatin: { variable: 'fredoka-latin-var' },
    fredokaHebrew: { variable: 'fredoka-hebrew-var' },
    rubikLatin: { variable: 'rubik-latin-var' },
    rubikHebrew: { variable: 'rubik-hebrew-var' },
    heeboHebrew: { variable: 'heebo-hebrew-var' },
    fredokaCyrillic: { variable: 'fredoka-cyrillic-var' },
    rubikCyrillic: { variable: 'rubik-cyrillic-var' },
}));

describe('LocaleLayout Hydration', () => {
    it('should render without hydration mismatch', { timeout: 30000 }, async () => {
        const LocaleLayout = (await import('../layout')).default;

        // Spy on console.error to catch React hydration warnings
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const params = Promise.resolve({ locale: 'en' });
        const { container } = render(
            await LocaleLayout({
                children: <div data-testid="test-content">Test Content</div>,
                params,
            })
        );

        // The layout renders as an html element, which testing-library handles
        // by mounting it in the test container. Just verify it renders something.
        expect(container).toBeTruthy();
        expect(container.innerHTML).toBeTruthy();

        // Check for skip link text which should always be present
        expect(container.textContent).toContain('Skip to main content');

        // No ad UNITS (manual <ins class="adsbygoogle"> placements) before approval.
        const adUnits = document.querySelectorAll('ins.adsbygoogle');
        expect(adUnits.length).toBe(0);

        // Check for hydration errors
        const hydrationErrors = consoleError.mock.calls.filter(call =>
            call[0]?.toString().includes('Hydration') ||
            call[0]?.toString().includes('did not match')
        );

        expect(hydrationErrors.length).toBe(0);

        consoleError.mockRestore();
    });

});

describe('generateMetadata App Links (al:android)', () => {
    it('includes al:android meta tags pointing at the Play Store package, so social shares (Facebook/Twitter/Slack) render an Open-in-App action', async () => {
        const { generateMetadata } = await import('../layout');

        const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) } as Parameters<typeof generateMetadata>[0]);

        expect(metadata.other?.['al:android:package']).toBe('live.lexiclash.app');
        expect(metadata.other?.['al:android:app_name']).toBe('LexiClash');
        expect(metadata.other?.['al:android:url']).toBe('https://www.lexiclash.live/en');
        expect(metadata.other?.['al:web:should_fallback']).toBe('true');
    });

    it('points al:android:url at the locale-specific page', async () => {
        const { generateMetadata } = await import('../layout');

        const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) } as Parameters<typeof generateMetadata>[0]);

        expect(metadata.other?.['al:android:url']).toBe('https://www.lexiclash.live/he');
    });
});

describe('AdSense SSR loader (pre-approval verification + Funding Choices CMP)', () => {
    // Walk the layout's returned element tree (not the DOM): React 19 hoists
    // <script async src> into the real document.head exactly once per document
    // per test process, which makes DOM-level assertions order-dependent.
    type AnyElement = { type?: unknown; props?: Record<string, unknown> } | null | undefined;
    function findAdsenseScript(node: unknown): { props: Record<string, unknown> } | null {
        if (node == null || typeof node !== 'object') return null;
        if (Array.isArray(node)) {
            for (const child of node) {
                const found = findAdsenseScript(child);
                if (found) return found;
            }
            return null;
        }
        const el = node as AnyElement;
        // Matched by id, not by `type === 'script'`: the loader is a next/script <Script>, whose
        // type is a component reference. It became one because a raw SSR'd <script async> in
        // <head> raced hydration — see headScriptsHydration.test.ts.
        if (el?.props?.id === 'adsbygoogle-init') {
            return el as { props: Record<string, unknown> };
        }
        if (el?.props && typeof el.props === 'object' && 'children' in el.props) {
            return findAdsenseScript(el.props.children);
        }
        return null;
    }

    it('renders no AdSense script of its own, for any locale', async () => {
        const LocaleLayout = (await import('../layout')).default;

        for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
            const tree = await LocaleLayout({
                children: <div>content</div>,
                params: Promise.resolve({ locale }),
            });

            // The layout used to render this unconditionally, which (a) stamped next/script's
            // `data-nscript` that AdSense rejects and (b) claimed the `adsbygoogle-init` id
            // before AdSenseLoader could, permanently short-circuiting its consent/tier/FTUE
            // gates via the loader's own `getElementById` guard.
            expect(findAdsenseScript(tree), `stray loader for locale ${locale}`).toBeNull();
            expect(JSON.stringify(tree)).not.toContain('adsbygoogle.js');
        }
    });

    // Dropped: an `occurrences === 1` check that called itself "no duplicate injection" and
    // passed throughout the actual duplicate-injection bug. AdSenseLoader injects from a
    // `useEffect`, so it never appears in the SSR element tree — a tree scan can only ever
    // see one of the two injectors, making the count vacuous. That the loader stays mounted
    // is pinned at source level in headScriptsHydration.test.ts instead.
});
