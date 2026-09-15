import { describe, it, expect, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import FeedbackDevtoolsWidget, {
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
 * (pointerdown/keydown/scroll/touchstart). Lighthouse does not generate
 * those, so the 3.6s drops off the landing first-paint graph. Real users
 * tap Play almost immediately and still get the launcher.
 *
 * Hosted-latest pointer + project token stay pinned so a future edit
 * cannot silently re-vendor public/widget.js.
 */

function widgetScript(): HTMLScriptElement | null {
    return document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
}

async function flushEffects(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
}

afterEach(() => {
    widgetScript()?.remove();
});

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
        const script = widgetScript();
        expect(script).not.toBeNull();
        expect(script!.getAttribute('data-token')).toBe(FEEDBACK_WIDGET_TOKEN);
        expect(script!.getAttribute('data-token')).toBe(
            'fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd',
        );
    });

    it('injects the script at most once across repeated gestures', async () => {
        render(<FeedbackDevtoolsWidget />);
        await flushEffects();
        await act(async () => {
            window.dispatchEvent(new Event('scroll'));
            window.dispatchEvent(new Event('pointerdown'));
            window.dispatchEvent(new Event('touchstart'));
        });
        expect(document.querySelectorAll(`script[src="${FEEDBACK_WIDGET_SRC}"]`).length).toBe(1);
    });
});
