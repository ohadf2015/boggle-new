import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';

// Bug report: "the interpolation isn't working" — t()'s fallback branches
// (translations not loaded yet, or key missing from the loaded set) return the
// raw fallback string without ever running the {placeholder} substitution that
// only lived in the "key found" branch. Any call site with a fallback+params —
// e.g. t('daily.flow.progress', '{done} of {total} cleared', { done, total })
// — leaked literal "{done}"/"{total}" whenever the key was missing for that
// locale, which was true for es/he/ja/sv before daily.flow.* was backfilled.

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/en',
}));

const loadTranslationMock = vi.fn(async (_lang: string) => ({
    direction: 'ltr',
    flag: '🇺🇸',
    known: { greeting: 'Hi {name}, you have {count} points' },
}));

vi.mock('../../translations/loadTranslation', () => ({
    loadTranslation: (lang: string) => loadTranslationMock(lang),
    getCachedTranslation: vi.fn(() => undefined),
    seedTranslationCache: vi.fn(),
}));

function Probe({ onReady }: { onReady: (t: ReturnType<typeof useLanguage>['t']) => void }) {
    const { t } = useLanguage();
    React.useEffect(() => {
        onReady(t);
    }, [t, onReady]);
    return null;
}

describe('LanguageContext t() — interpolation on fallback paths', () => {
    it('interpolates params into the fallback while translations are still loading', () => {
        let tFn: ReturnType<typeof useLanguage>['t'] | null = null;
        render(
            <LanguageProvider initialLanguage="en">
                <Probe onReady={(t) => { tFn = t; }} />
            </LanguageProvider>
        );

        // Translations resolve asynchronously — call t() on the very first render,
        // before the loadTranslation promise settles, to hit the "not loaded" path.
        expect(tFn).not.toBeNull();
        expect(tFn!('daily.flow.progress', '{done} of {total} cleared', { done: 2, total: 3 }))
            .toBe('2 of 3 cleared');
    });

    it('interpolates params into the fallback when the key is missing from loaded translations', async () => {
        let tFn: ReturnType<typeof useLanguage>['t'] | null = null;
        render(
            <LanguageProvider initialLanguage="en">
                <Probe onReady={(t) => { tFn = t; }} />
            </LanguageProvider>
        );

        await waitFor(() => expect(loadTranslationMock).toHaveBeenCalled());
        await waitFor(() => {
            expect(tFn!('daily.flow.progress', '{done} of {total} cleared', { done: 2, total: 3 }))
                .toBe('2 of 3 cleared');
        });
    });

    it('still interpolates a found translation (no regression)', async () => {
        let tFn: ReturnType<typeof useLanguage>['t'] | null = null;
        render(
            <LanguageProvider initialLanguage="en">
                <Probe onReady={(t) => { tFn = t; }} />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(tFn!('known.greeting', undefined, { name: 'Ada', count: 5 }))
                .toBe('Hi Ada, you have 5 points');
        });
    });
});
