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
 * Placed data-side="left" so the launcher never overlaps the in-app
 * FeedbackFab (bottom-right) or the global bottom nav.
 *
 * SECURITY: All attribute values are static string literals — no user input.
 */

import Script from 'next/script';
import type { ReactNode } from 'react';

export default function FeedbackDevtoolsWidget(): ReactNode {
    return (
        <Script
            id="fdw-widget"
            src="/widget.js"
            data-token="fdt_28ac691a628a0f801bdc8044d9783d105ec5d72bb85d62a2"
            data-side="left"
            data-label="Feedback"
            data-accent="#ffe135"
            data-dir="auto"
            data-app-version="web"
            strategy="afterInteractive"
        />
    );
}
