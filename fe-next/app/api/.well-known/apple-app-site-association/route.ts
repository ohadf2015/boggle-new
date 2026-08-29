/**
 * Apple App Site Association (AASA)
 * Serves the AASA file for iOS Universal Links verification
 * Must be at /.well-known/apple-app-site-association with Content-Type: application/json
 */

import { NextResponse } from 'next/server';

const APP_BUNDLE_ID = 'live.lexiclash.app';

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID || '';

  // Without a team ID the appID would be ".live.lexiclash.app", which iOS rejects
  // — and iOS CACHES the association it fetches, so serving a malformed one is
  // strictly worse than serving none. A 5xx leaves it to retry once the env var
  // is actually configured. (Production served the malformed form: APPLE_TEAM_ID
  // was never set in the deployed environment.)
  if (!teamId) {
    return NextResponse.json(
      { error: 'APPLE_TEAM_ID is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const appId = `${teamId}.${APP_BUNDLE_ID}`;

  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: [
            '/auth/callback*',
            '/*/auth/callback*',
            '/join/*',
            '/*/join/*',
            '/*/adventure*',
            '/*/multiplayer*',
            '/*/leaderboard*',
          ],
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
