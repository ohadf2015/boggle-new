/**
 * Apple App Site Association (AASA)
 * Serves the AASA file for iOS Universal Links verification
 * Must be at /.well-known/apple-app-site-association with Content-Type: application/json
 */

import { NextResponse } from 'next/server';

const APP_BUNDLE_ID = 'live.lexiclash.app';

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID || '';
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
