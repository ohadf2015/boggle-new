import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { SCROLL_QUIET_MS } from '@/lib/perf/runWhenScrollSettles';
import { act, render } from '@testing-library/react';
import FeedbackDevtoolsWidget, {
    FEEDBACK_WIDGET_IGNORE_CONSOLE,
    FEEDBACK_WIDGET_INTENT_EVENTS,
    FEEDBACK_WIDGET_SCRIPT_ID,
    FEEDBACK_WIDGET_SRC,
    FEEDBACK_WIDGET_TOKEN,
} from '../FeedbackDevtoolsWidget';

/**
 * Piece 3 (PSI gauntlet): widget.js is 250 KiB / ~3.6s scripting on the
 * landing first paint when loaded via next/script lazyOnload. Lighthouse
 * still downloads + evaluates lazyOnload tags during the trace.
 *
 * Intent-gate: do not emit a <script> until the first user gesture
 * (pointerdown/keydown/touchstart). Do NOT use `scroll` — Lighthouse
 * scrolls while hunting LCP. Real users tap Play almost immediately
 * and still get the launcher.
 *
 * Hosted-latest pointer + project token stay pinned so a future edit
 * cannot silently re-vendor public/widget.js.
 */

function widgetScript(): HTMLScriptElement | null {
    return document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
}

const originalLocation = window.location;
const originalFlag = process.env.NEXT_PUBLIC_FDT_ENABLED;

function stubHost(hostname: string): void {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, hostname },
    });
}

/** Existing cases describe the open-gate path (prod host + explicit flag). */
function openProdGates(): void {
    stubHost('www.lexiclash.live');
    process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
}

async function flushEffects(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    openProdGates();
});

afterEach(() => {
    vi.useRealTimers();
    widgetScript()?.remove();
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
    else process.env.NEXT_PUBLIC_FDT_ENABLED = originalFlag;
});

const settle = () => act(() => { vi.advanceTimersByTime(SCROLL_QUIET_MS + 50); });

describe('<FeedbackDevtoolsWidget>', () => {
    it('does not inject widget.js on first paint (no script tag until intent)', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        expect(widgetScript()).toBeNull();
        expect(document.querySelector('script[src*="widget.js"]')).toBeNull();
    });

    it('injects the hosted-latest widget pointer after the first user gesture', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        settle();
        const script = widgetScript();
        expect(script).not.toBeNull();
        const src = script!.getAttribute('src') || '';
        expect(src).toBe(FEEDBACK_WIDGET_SRC);
        expect(src).toBe('https://server-production-14a9.up.railway.app/widget.js');
        // No local vendored copy: re-vendoring public/widget.js would freeze
        // updates again — the pointer must stay hosted.
        expect(src.startsWith('/')).toBe(false);
        expect(src).not.toContain('?v=');
    });

    it('carries the current LexiClash project ingest token after intent', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('keydown'));
        });
        settle();
        const script = widgetScript();
        expect(script).not.toBeNull();
        expect(script!.getAttribute('data-token')).toBe(FEEDBACK_WIDGET_TOKEN);
        expect(script!.getAttribute('data-token')).toBe(
            'fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd',
        );
    });

    it('does not treat Lighthouse page-scroll as intent', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('scroll'));
        });
        expect(widgetScript()).toBeNull();
        expect(FEEDBACK_WIDGET_INTENT_EVENTS).not.toContain('scroll');
    });

    it('opts the hosted widget into the FedCM/GSI_LOGGER console filter only', async () => {
        expect(JSON.parse(FEEDBACK_WIDGET_IGNORE_CONSOLE)).toEqual(['GSI_LOGGER', 'FedCM']);
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        settle();
        const script = widgetScript();
        expect(script).not.toBeNull();
        const raw = script!.getAttribute('data-ignore-console');
        expect(raw).toBe(FEEDBACK_WIDGET_IGNORE_CONSOLE);
        const rules = JSON.parse(raw || '[]') as string[];
        expect(rules).toEqual(['GSI_LOGGER', 'FedCM']);
        expect(rules).toHaveLength(2);
    });

    it('injects the script at most once across repeated gestures', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
            window.dispatchEvent(new Event('touchstart'));
            window.dispatchEvent(new Event('keydown'));
        });
        settle();
        expect(document.querySelectorAll(`script[src="${FEEDBACK_WIDGET_SRC}"]`).length).toBe(1);
    });
});

describe('<FeedbackDevtoolsWidget> production gate', () => {
    async function gesture(): Promise<void> {
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
            window.dispatchEvent(new Event('keydown'));
            window.dispatchEvent(new Event('touchstart'));
        });
        settle();
    }

    it('does not inject on localhost even when the flag is true', async () => {
        stubHost('localhost');
        process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        expect(widgetScript()).toBeNull();
        expect(document.querySelector('script[src*="widget.js"]')).toBeNull();
    });

    it('does not inject on a non-prod host', async () => {
        stubHost('staging.lexiclash.live');
        process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        expect(widgetScript()).toBeNull();
    });

    it('does not inject on the apex host (www is the hard backstop)', async () => {
        stubHost('lexiclash.live');
        process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        expect(widgetScript()).toBeNull();
    });

    it.each([undefined, '', 'false', 'TRUE', '1'])(
        'does not inject on the prod host when the flag is %s',
        async (flag) => {
            stubHost('www.lexiclash.live');
            if (flag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
            else process.env.NEXT_PUBLIC_FDT_ENABLED = flag;
            render(<FeedbackDevtoolsWidget />);
            await gesture();
            expect(widgetScript()).toBeNull();
        },
    );
});
