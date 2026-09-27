// GET /api/ping — minimal reachability probe.
//
// Used by hooks/useNetworkState to confirm true reachability beyond
// navigator.onLine (which lies about captive portals + air-gapped wifi).
// Returns 204 No Content with Cache-Control:no-store so it's always fresh
// and never gets satisfied by service worker / CDN.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function HEAD(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
