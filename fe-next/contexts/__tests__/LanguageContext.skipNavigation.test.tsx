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

/**
 * Regression guard: FTUE language step calls setLanguage(lang, { skipNavigation: true })
 * so that PageClient does NOT remount and lose its local `hasSeenOnboarding`/step state —
 * which would bounce the user back to the language picker immediately after confirming.
 */
describe('LanguageContext — setLanguage skipNavigation option', () => {
    beforeEach(() => {
        pushMock.mockClear();
        replaceMock.mockClear();
        localStorage.clear();
        document.cookie = 'boggle_language=; path=/; max-age=0';
        document.cookie = 'boggle_language_explicit=; path=/; max-age=0';
        mockPathname = '/en';
    });

    it('updates state + persists but does NOT navigate when skipNavigation is true', async () => {
        const capturedRef: { current: ReturnType<typeof useLanguage> | null } = { current: null };
        function Capture() {
            const value = useLanguage();
            React.useEffect(() => {
                capturedRef.current = value;
            });
            return null;
        }

        render(
            <LanguageProvider initialLanguage="en">
                <Capture />
            </LanguageProvider>
        );

        await waitFor(() => expect(capturedRef.current).not.toBeNull());

        await act(async () => {
            capturedRef.current!.setLanguage('he', { skipNavigation: true });
        });

        expect(localStorage.getItem('boggle_language')).toBe('he');
        expect(pushMock).not.toHaveBeenCalled();
    });

    it('navigates when skipNavigation is omitted (default behavior unchanged)', async () => {
        const capturedRef: { current: ReturnType<typeof useLanguage> | null } = { current: null };
        function Capture() {
            const value = useLanguage();
            React.useEffect(() => {
                capturedRef.current = value;
            });
            return null;
        }

        render(
            <LanguageProvider initialLanguage="en">
                <Capture />
            </LanguageProvider>
        );

        await waitFor(() => expect(capturedRef.current).not.toBeNull());

        await act(async () => {
            capturedRef.current!.setLanguage('he');
        });

        expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/he'));
    });
});
