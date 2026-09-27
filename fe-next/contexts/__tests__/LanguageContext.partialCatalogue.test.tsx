/**
 * Sentry JAVASCRIPT-NEXTJS-279 / -27A / -27B / -27E / -27H / -27J / -27K / -27N
 * — "Translation missing for key: multiplayerFlow.* in language: en", all from
 * https://www.lexiclash.live/en/multiplayer, all first seen ~12h after
 * 26f60b89a shipped the landing first-paint i18n subset.
 *
 * The keys are NOT missing (translations/en.js has carried them since
 * 4894f412c). `/en` boots on the landing subset — chrome + hero namespaces only
 * (lib/i18n/landingNamespaces.ts) — and a client-side nav to /en/multiplayer
 * renders against that subset, because the full catalogue arrives on idle and
 * the layout <script> only runs on a full page load.
 *
 * Two distinct defects, two assertions here:
 *  1. a key outside the subset paged Sentry as a missing key;
 *  2. once the full catalogue landed, memoized subtrees kept the stale `t` —
 *     `translationsReady` was already `true`, so the boolean never changed and
 *     `t`'s identity never did either. Raw key paths stayed on screen forever.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PARTIAL_FLAG } from '@/lib/i18n/pickLandingMessages';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/en',
}));

const warn = vi.fn();
vi.mock('@/utils/logger', () => ({
    default: { warn: (...a: unknown[]) => warn(...a), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

const trackTelemetryEvent = vi.fn();
vi.mock('@/utils/sentry', () => ({
    trackTelemetryEvent: (...a: unknown[]) => trackTelemetryEvent(...a),
}));

const PARTIAL = { [PARTIAL_FLAG]: true, direction: 'ltr', flag: '🇺🇸', nav: { howToPlay: 'How to play' } };
const FULL = {
    direction: 'ltr',
    flag: '🇺🇸',
    nav: { howToPlay: 'How to play' },
    multiplayerFlow: { createModal: { title: 'Create a room' } },
};

vi.mock('../../translations/loadTranslation', () => ({
    loadTranslation: vi.fn(async () => FULL),
    getCachedTranslation: vi.fn(() => PARTIAL),
    seedTranslationCache: vi.fn(),
}));

import { LanguageProvider, useLanguage } from '../LanguageContext';

function Probe({ onReady }: { onReady: (t: ReturnType<typeof useLanguage>['t']) => void }) {
    const { t } = useLanguage();
    React.useEffect(() => {
        onReady(t);
    }, [t, onReady]);
    return null;
}

beforeEach(() => {
    warn.mockClear();
    trackTelemetryEvent.mockClear();
});

describe('LanguageContext on the landing first-paint subset', () => {
    it('does not page Sentry for a key the partial catalogue was never meant to carry', () => {
        let tFn: ReturnType<typeof useLanguage>['t'] | null = null;
        render(
            <LanguageProvider initialLanguage="en">
                <Probe onReady={(t) => { tFn = t; }} />
            </LanguageProvider>,
        );

        expect(tFn!('multiplayerFlow.createModal.title')).toBe('multiplayerFlow.createModal.title');
        expect(
            warn.mock.calls.map(String).join('\n'),
            'a key outside the landing subset is a load state, not a missing key',
        ).not.toContain('Translation missing');
        // Still queryable in PostHog, tagged so a genuinely absent key stays visible.
        expect(trackTelemetryEvent).toHaveBeenCalledWith(
            'translation_missing',
            expect.objectContaining({ key: 'multiplayerFlow.createModal.title', partial: true }),
        );
    });

    it('re-renders a memoized subtree once the full catalogue upgrades in', async () => {
        const Child = React.memo(function Child({ t }: { t: (k: string) => string }) {
            return <span data-testid="title">{t('multiplayerFlow.createModal.title')}</span>;
        });
        function Host() {
            const { t } = useLanguage();
            return <Child t={t} />;
        }
        render(<LanguageProvider initialLanguage="en"><Host /></LanguageProvider>);

        expect(screen.getByTestId('title').textContent).toBe('multiplayerFlow.createModal.title');

        // The provider upgrades on first interaction (or on idle within 4s).
        window.dispatchEvent(new Event('pointerdown'));

        await waitFor(() => {
            expect(screen.getByTestId('title').textContent).toBe('Create a room');
        });
    });

    it('still pages Sentry for a key missing from a COMPLETE catalogue', async () => {
        const loader = await import('../../translations/loadTranslation');
        // Every call, not just the first: the provider reads the cache in the
        // state initializer AND again in the load effect.
        vi.mocked(loader.getCachedTranslation).mockReturnValue(FULL);

        let tFn: ReturnType<typeof useLanguage>['t'] | null = null;
        render(
            <LanguageProvider initialLanguage="en">
                <Probe onReady={(t) => { tFn = t; }} />
            </LanguageProvider>,
        );

        expect(tFn!('multiplayerFlow.createModal.nope')).toBe('multiplayerFlow.createModal.nope');
        expect(warn.mock.calls.map(String).join('\n')).toContain('Translation missing');
        vi.mocked(loader.getCachedTranslation).mockReturnValue(PARTIAL);
    });
});
