import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let mockPathname = '/en';

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

describe('LanguageContext — explicit preference persistence (Android WebView fix)', () => {
    beforeEach(() => {
        pushMock.mockClear();
        replaceMock.mockClear();
        localStorage.clear();
        document.cookie = 'boggle_language=; path=/; max-age=0';
        document.cookie = 'boggle_language_explicit=; path=/; max-age=0';
        mockPathname = '/en';
    });

    it('redirects to saved locale when explicit flag set and URL locale differs', async () => {
        localStorage.setItem('boggle_language', 'he');
        localStorage.setItem('boggle_language_explicit', '1');
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('/he'));
        });
    });

    it('does NOT override URL locale when no explicit flag (shared-link case)', async () => {
        localStorage.setItem('boggle_language', 'he');
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        await new Promise((r) => setTimeout(r, 20));
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it('marks explicit + persists to localStorage when user changes language mid-session', async () => {
        const capturedRef: { current: ReturnType<typeof useLanguage> | null } = { current: null };
        function Capture() {
            const value = useLanguage();
            React.useEffect(() => {
                capturedRef.current = value;
            });
            return null;
        }
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <Capture />
            </LanguageProvider>
        );

        await waitFor(() => expect(capturedRef.current).not.toBeNull());

        await act(async () => {
            capturedRef.current!.setLanguage('he');
        });

        expect(localStorage.getItem('boggle_language')).toBe('he');
        expect(localStorage.getItem('boggle_language_explicit')).toBe('1');
        expect(document.cookie).toContain('boggle_language=he');
        expect(document.cookie).toContain('boggle_language_explicit=1');
    });

    it('does nothing when explicit saved locale matches URL', async () => {
        localStorage.setItem('boggle_language', 'en');
        localStorage.setItem('boggle_language_explicit', '1');
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <Probe />
            </LanguageProvider>
        );

        await new Promise((r) => setTimeout(r, 20));
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
