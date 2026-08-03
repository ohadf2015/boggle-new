// ---------------------------------------------------------------------------
// Same-origin proxy for the embedded feedback.devtools widget.
//
// The widget (public/widget.js) posts to `${origin}/api/v1/feedback?sdk=<token>`
// with Content-Type text/plain and NO Authorization header (CORS "simple
// request" workaround — the token travels in the `sdk` query param, which is
// the upstream ingest API's native SDK auth scheme). Proxying server-side
// sidesteps cross-origin CORS entirely: the browser only ever talks to this
// origin.
//
// Security: the SDK token is the project's PUBLIC ingest token (visible in the
// embed component by design — same exposure model as every feedback-devtools
// customer embed). We accept it via `?sdk=` or an Authorization header,
// forward it unchanged, and never log it. Upstream enforces token validity +
// per-IP rate limits.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_URL =
    process.env.FEEDBACK_INGEST_URL ??
    'https://server-production-14a9.up.railway.app/api/v1/feedback';

// Matches the upstream ingest cap (8 MiB). The widget auto-retries without its
// screenshot attachment on 413, so oversized payloads degrade gracefully.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
    const url = new URL(req.url);
    // Widget sends ?sdk=<token>; direct API clients may send Authorization.
    const sdkToken = url.searchParams.get('sdk');
    const auth = req.headers.get('authorization');
    if (!sdkToken && !auth) {
        return NextResponse.json(
            { error: 'Missing credentials (sdk query param or Authorization header)' },
            { status: 401 },
        );
    }

    let body: string;
    try {
        body = await req.text();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!body || body.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // The widget posts Content-Type: text/plain, but the ingest API only
    // JSON-parses application/json bodies — validate + re-serialize here so we
    // always forward application/json.
    let payload: unknown;
    try {
        payload = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return NextResponse.json({ error: 'Expected JSON object body' }, { status: 400 });
    }

    // Forward using the upstream's native auth: ?sdk= query param (same scheme
    // the widget uses when embedded cross-origin). Fall back to passing through
    // an Authorization header for direct API clients.
    const upstreamUrl = sdkToken
        ? `${UPSTREAM_URL}?sdk=${encodeURIComponent(sdkToken)}`
        : UPSTREAM_URL;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!sdkToken && auth) headers['Authorization'] = auth;

    try {
        const upstream = await fetch(upstreamUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const text = await upstream.text();
        return new Response(text, {
            status: upstream.status,
            headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
        });
    } catch {
        return NextResponse.json({ error: 'Upstream ingest unavailable' }, { status: 502 });
    }
}
