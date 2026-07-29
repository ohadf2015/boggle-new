import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
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

describe('LanguageContext — server-side language sync', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        pushMock.mockClear();
        replaceMock.mockClear();
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'boggle_language=; path=/; max-age=0';
        document.cookie = 'boggle_language_explicit=; path=/; max-age=0';
        mockPathname = '/en';

        // Seed a live Supabase session so the auto-sync POST is allowed to fire.
        // hasSupabaseSession() reads sb-<id>-auth-token with looksLive() requiring access_token.
        localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'test-token' }));

        fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
    });

    it('POSTs current language to /api/user/language on mount', async () => {
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            const call = fetchMock.mock.calls.find((c) => c[0] === '/api/user/language');
            expect(call).toBeDefined();
            expect(call![1]).toMatchObject({ method: 'POST' });
            // Auto-sync: explicit=false signals to API "do not clobber existing pref"
            expect(JSON.parse(call![1].body)).toEqual({ language: 'en', explicit: false });
        });
    });

    it('setLanguage() POSTs explicit:true so deliberate switcher click overwrites server', async () => {
        mockPathname = '/en';

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        // Wait for the mount auto-sync POST to fire.
        await waitFor(() => {
            expect(fetchMock.mock.calls.some((c) => c[0] === '/api/user/language')).toBe(true);
        });
        fetchMock.mockClear();

        act(() => {
            result.current.setLanguage('he', { skipNavigation: true });
        });

        await waitFor(() => {
            const call = fetchMock.mock.calls.find((c) => c[0] === '/api/user/language');
            expect(call).toBeDefined();
            expect(JSON.parse(call![1].body)).toEqual({ language: 'he', explicit: true });
        });
    });

    it('does not POST twice in the same session (dedup via sessionStorage)', async () => {
        mockPathname = '/en';

        const { unmount } = render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(fetchMock.mock.calls.some((c) => c[0] === '/api/user/language')).toBe(true);
        });

        const firstCallCount = fetchMock.mock.calls.filter((c) => c[0] === '/api/user/language').length;
        unmount();
        fetchMock.mockClear();

        render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await new Promise((r) => setTimeout(r, 30));

        const secondCallCount = fetchMock.mock.calls.filter((c) => c[0] === '/api/user/language').length;
        expect(firstCallCount).toBe(1);
        expect(secondCallCount).toBe(0);
    });

    it('does NOT lock dedup gate when POST fails (e.g. 401 anon) — next mount retries', async () => {
        mockPathname = '/en';
        // First mount: simulate anonymous user — endpoint returns 401
        fetchMock.mockImplementationOnce(
            async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        );

        const { unmount } = render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(fetchMock.mock.calls.some((c) => c[0] === '/api/user/language')).toBe(true);
        });

        unmount();
        fetchMock.mockClear();
        // Second mount: simulate post-login (200 OK) — must POST again because
        // 401 should not have set the sessionStorage dedup gate.
        fetchMock.mockImplementation(
            async () => new Response(JSON.stringify({ success: true }), { status: 200 })
        );

        render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            const call = fetchMock.mock.calls.find((c) => c[0] === '/api/user/language');
            expect(call).toBeDefined();
            expect(JSON.parse(call![1].body)).toEqual({ language: 'en', explicit: false });
        });
    });

    it('skips POST entirely when no live Supabase session (guest / pre-login)', async () => {
        mockPathname = '/en';
        // Wipe seeded session — guest path
        localStorage.clear();

        render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await new Promise((r) => setTimeout(r, 30));
        const calls = fetchMock.mock.calls.filter((c) => c[0] === '/api/user/language');
        expect(calls).toHaveLength(0);
    });

    it('re-POSTs when language changes (different lang invalidates dedup)', async () => {
        mockPathname = '/en';

        render(
            <LanguageProvider initialLanguage="en">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(fetchMock.mock.calls.some((c) => c[0] === '/api/user/language')).toBe(true);
        });
        fetchMock.mockClear();

        // Simulate a later provider mount under a different locale (navigation)
        mockPathname = '/he';
        render(
            <LanguageProvider initialLanguage="he">
                <span />
            </LanguageProvider>
        );

        await waitFor(() => {
            const call = fetchMock.mock.calls.find((c) => c[0] === '/api/user/language');
            expect(call).toBeDefined();
            expect(JSON.parse(call![1].body)).toEqual({ language: 'he', explicit: false });
        });
    });
});
