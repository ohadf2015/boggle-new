/**
 * feedback.devtools widget — shared feedback module (module 5).
 *
 * Self-hosted bundle (public/widget.js, fetched from the feedback-devtools
 * server) loaded via next/script afterInteractive. Submissions POST to the
 * same-origin /api/v1/feedback proxy (app/api/v1/feedback/route.ts), which
 * forwards to the upstream ingest API server-side — sidesteps any cross-origin
 * CORS issues entirely.
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
 * CACHE-BUSTING: widget.js was previously served with `immutable, max-age=1yr`,
 * which froze it in returning users' browsers — the neo-brutalist restyle and
 * the mobile icon-only collapse never reached them (they kept seeing the old
 * oversized, default-themed, text-labelled pill). The middleware now serves it
 * `must-revalidate`, but an ALREADY-cached immutable copy is never revalidated,
 * so the only reliable escape is a fresh URL. WIDGET_VERSION is appended as a
 * `?v=` query the frozen cache entry does not cover — bump it whenever
 * public/widget.js changes to force every browser to re-fetch.
 *
 * SECURITY: All attribute values are static string literals — no user input.
 */
// Bump on every public/widget.js change to bust returning users' frozen cache.
const WIDGET_VERSION = '2';

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
            src={`/widget.js?v=${WIDGET_VERSION}`}
            data-token="fdt_28ac691a628a0f801bdc8044d9783d105ec5d72bb85d62a2"
            data-side="left"
            data-label="Feedback"
            data-theme={LEXICLASH_THEME}
            data-dir="auto"
            data-app-version="web"
            strategy="afterInteractive"
        />
    );
}
