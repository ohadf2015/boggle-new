import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { locales, defaultLocale } from '../../lib/i18n';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let mockPathname: string = '/en';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock, replace: replaceMock }),
    usePathname: () => mockPathname,
}));

vi.mock('../../translations/loadTranslation', () => ({
    loadTranslation: vi.fn(async () => ({ direction: 'ltr', flag: '🇺🇸' })),
    getCachedTranslation: vi.fn(() => undefined),
    seedTranslationCache: vi.fn(),
}));

function Probe() {
    const { language } = useLanguage();
    return <span data-testid="lang">{language}</span>;
}

function setBrowserLanguages(langs: string[]) {
    Object.defineProperty(window.navigator, 'languages', {
        value: langs,
        configurable: true,
    });
}

describe('i18n defaults are English (regression: everyone routed to Hebrew)', () => {
    it('defaultLocale is "en", not "he"', () => {
        expect(defaultLocale).toBe('en');
    });

    it('locales[0] is "en" so any locales[0] fallback resolves to English', () => {
        expect(locales[0]).toBe('en');
    });
});

describe('LanguageContext — server/URL locale is authoritative over browser language', () => {
    beforeEach(() => {
        pushMock.mockClear();
        replaceMock.mockClear();
        localStorage.clear();
        document.cookie = 'boggle_language=; path=/; max-age=0';
        document.cookie = 'boggle_language_explicit=; path=/; max-age=0';
        mockPathname = '/en';
    });

    afterEach(() => {
        setBrowserLanguages(['en-US', 'en']);
    });

    it('does NOT flip a Hebrew-browser user to "he" on /en when pathname is momentarily empty', async () => {
        // The reported regression: usePathname() can be falsy on the first client
        // render. The old mount effect then dropped into the browser-language branch
        // and switched Hebrew-browser users to /he despite the correct /en URL.
        setBrowserLanguages(['he-IL', 'he']);
        mockPathname = ''; // simulate the brief empty-pathname window

        const { getByTestId } = render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        // Give the mount effect time to (incorrectly) flip the language.
        await new Promise((r) => setTimeout(r, 30));
        expect(getByTestId('lang').textContent).toBe('en');
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it('keeps a Hebrew-browser user on "en" when the URL is /en (no saved preference)', async () => {
        setBrowserLanguages(['he-IL', 'he']);
        mockPathname = '/en';

        const { getByTestId } = render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        await new Promise((r) => setTimeout(r, 30));
        expect(getByTestId('lang').textContent).toBe('en');
    });

    it('still honors an explicit saved preference over the URL locale (persistence)', async () => {
        // New requirement: once a user picks a language it must always win.
        localStorage.setItem('boggle_language', 'es');
        localStorage.setItem('boggle_language_explicit', '1');
        setBrowserLanguages(['he-IL', 'he']);
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('/es'));
        });
    });
});
