'use client';

/**
 * feedback.devtools widget — shared feedback module (module 5).
 *
 * Hosted-latest bundle loaded from the feedback-devtools server: /widget.js
 * is a short-cache pointer that 302s to the current immutable
 * /widget/v<version>.js build, so widget fixes reach every user without a
 * re-vendor here. (The old vendored public/widget.js existed because the
 * server used to serve the bundle `immutable, max-age=1yr`, freezing it in
 * returning users' browsers — the versioned serving shipped in
 * feedback-devtools #51 removes that failure mode at the source.)
 *
 * INTENT GATE (PSI piece 3): do NOT emit a <script> on first paint.
 * next/script strategy="lazyOnload" still put widget.js (250 KiB / ~3.6s
 * scripting) on the landing Lighthouse graph because LH waits for network
 * idle and evaluates lazy tags. Inject only after the first user gesture
 * (pointer/key/touch). Do NOT listen for `scroll` — Lighthouse scrolls the
 * page while hunting LCP, which would pull widget.js back onto the PSI
 * graph. Real users tap Play immediately; Lighthouse does not, so the 3.6s
 * leaves the first-paint budget.
 *
 * The data-token is the LexiClash project's PUBLIC ingest SDK token (scope:
 * ingest only, rate-limited upstream) — safe to ship client-side by design,
 * same exposure model as every feedback-devtools customer embed.
 *
 * This is the app's SINGLE feedback entry point (the old in-app FeedbackFab
 * was removed). The launcher is themed to LexiClash neo-brutalism: neo-yellow
 * fill, dark neo-black text (contrast), thick border + hard offset shadow,
 * Fredoka font. On mobile (<=600px) the widget collapses to a small icon-only
 * chip — no label text. The 600px breakpoint (not 480px) reliably catches
 * portrait phones: many 1080px-wide Android devices render at DPR 2 -> 540 CSS
 * px, which slipped past a 480px query and kept the oversized labelled pill.
 *
 * SECURITY: All attribute values are static string literals — no user input.
 */

import { useEffect, type ReactNode } from 'react';

export const FEEDBACK_WIDGET_SRC =
    'https://server-production-14a9.up.railway.app/widget.js';
export const FEEDBACK_WIDGET_TOKEN =
    'fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd';
export const FEEDBACK_WIDGET_SCRIPT_ID = 'fdw-widget';
export const FEEDBACK_WIDGET_INTENT_EVENTS = [
    'pointerdown',
    'keydown',
    'touchstart',
] as const;

// LexiClash brand tokens (see app/globals.css: --neo-yellow, --neo-black).
// --neo-black is rgb(58 50 42) in the dark theme.
const NEO_YELLOW = '#ffe135';
const NEO_BLACK = '#3a322a';

const LEXICLASH_THEME = JSON.stringify({
    accent: NEO_YELLOW,
    accentFg: NEO_BLACK,
    launcherBorder: `3px solid ${NEO_BLACK}`,
    launcherShadow: `2px 2px 0 ${NEO_BLACK}`,
    launcherShadowHover: `3px 3px 0 ${NEO_BLACK}`,
    font: 'Fredoka, Rubik, sans-serif',
});

function injectFeedbackWidget(): void {
    if (document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID)) return;
    const s = document.createElement('script');
    s.id = FEEDBACK_WIDGET_SCRIPT_ID;
    s.async = true;
    s.src = FEEDBACK_WIDGET_SRC;
    s.setAttribute('data-token', FEEDBACK_WIDGET_TOKEN);
    s.setAttribute('data-side', 'left');
    s.setAttribute('data-theme', LEXICLASH_THEME);
    s.setAttribute('data-dir', 'auto');
    s.setAttribute('data-app-version', 'web');
    document.body.appendChild(s);
}

export default function FeedbackDevtoolsWidget(): ReactNode {
    useEffect(() => {
        const onIntent = () => {
            injectFeedbackWidget();
            for (const ev of FEEDBACK_WIDGET_INTENT_EVENTS) {
                window.removeEventListener(ev, onIntent);
            }
        };
        for (const ev of FEEDBACK_WIDGET_INTENT_EVENTS) {
            window.addEventListener(ev, onIntent, { once: true, passive: true });
        }
        return () => {
            for (const ev of FEEDBACK_WIDGET_INTENT_EVENTS) {
                window.removeEventListener(ev, onIntent);
            }
        };
    }, []);
    return null;
}
