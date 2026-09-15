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

import Script from 'next/script';
import type { ReactNode } from 'react';

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

export default function FeedbackDevtoolsWidget(): ReactNode {
    return (
        <Script
            id="fdw-widget"
            src="https://server-production-14a9.up.railway.app/widget.js"
            data-token="fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd"
            data-side="left"
            data-theme={LEXICLASH_THEME}
            data-dir="auto"
            data-app-version="web"
            // Non-critical feedback launcher — lazyOnload keeps it out of the
            // landing first-paint window while still being available before the
            // user scrolls far.
            strategy="lazyOnload"
        />
    );
}
