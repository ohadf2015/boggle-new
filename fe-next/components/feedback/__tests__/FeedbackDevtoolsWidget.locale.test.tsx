import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { SCROLL_QUIET_MS } from '@/lib/perf/runWhenScrollSettles';
import { act, render } from '@testing-library/react';
import FeedbackDevtoolsWidget, { FEEDBACK_WIDGET_SCRIPT_ID } from '../FeedbackDevtoolsWidget';

/**
 * The hosted widget resolves its UI language ONCE, at init (data-locale,
 * <html lang>, navigator). Switching language in the app never re-labels
 * the already-mounted launcher, so it stayed on the first language the user
 * saw ("フィードバック" after returning to Hebrew). The host must re-init the
 * widget with the new locale whenever the app language changes.
 */

const originalLocation = window.location;
const originalFlag = process.env.NEXT_PUBLIC_FDT_ENABLED;

type FakeApi = { active: boolean; init: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };

function installFakeApi(): FakeApi {
    const api: FakeApi = {
        active: true,
        init: vi.fn(() => true),
        destroy: vi.fn(() => { api.active = false; }),
    };
    (window as unknown as { feedbackDevTools: FakeApi }).feedbackDevTools = api;
    return api;
}

const script = () => document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
const settle = () => act(() => { vi.advanceTimersByTime(SCROLL_QUIET_MS + 50); });

async function mountAndInject(lang: string) {
    const utils = render(<FeedbackDevtoolsWidget lang={lang} />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
    settle();
    return utils;
}

beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, hostname: 'www.lexiclash.live' },
    });
    process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
});

afterEach(() => {
    vi.useRealTimers();
    script()?.remove();
    delete (window as unknown as { feedbackDevTools?: unknown }).feedbackDevTools;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
    else process.env.NEXT_PUBLIC_FDT_ENABLED = originalFlag;
});

describe('<FeedbackDevtoolsWidget> locale follow', () => {
    it('injects the widget with the active locale', async () => {
        await mountAndInject('he');
        expect(script()!.getAttribute('data-locale')).toBe('he');
    });

    it('re-inits the live widget with the new locale on every language switch', async () => {
        const { rerender } = await mountAndInject('he');
        const api = installFakeApi();

        api.active = true;
        rerender(<FeedbackDevtoolsWidget lang="ja" />);
        expect(api.destroy).toHaveBeenCalledTimes(1);
        expect(api.init).toHaveBeenLastCalledWith({ locale: 'ja' });
        expect(script()!.getAttribute('data-locale')).toBe('ja');

        api.active = true;
        rerender(<FeedbackDevtoolsWidget lang="he" />);
        expect(api.destroy).toHaveBeenCalledTimes(2);
        expect(api.init).toHaveBeenLastCalledWith({ locale: 'he' });
        expect(script()!.getAttribute('data-locale')).toBe('he');
    });

    it('does nothing when the locale is unchanged or the widget is not injected yet', async () => {
        const { rerender } = render(<FeedbackDevtoolsWidget lang="he" />);
        const api = installFakeApi();
        rerender(<FeedbackDevtoolsWidget lang="ja" />);
        expect(api.destroy).not.toHaveBeenCalled();

        await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
        settle();
        rerender(<FeedbackDevtoolsWidget lang="ja" />);
        expect(api.destroy).not.toHaveBeenCalled();
    });
});
