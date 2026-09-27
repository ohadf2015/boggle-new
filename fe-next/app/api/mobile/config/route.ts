import { NextResponse } from 'next/server';

/**
 * Mobile App Config Endpoint
 *
 * Returns configuration the native app needs on startup:
 * - Minimum required version (for forced updates)
 * - Feature flags relevant to mobile
 * - WebSocket endpoint for the current environment
 * - Maintenance mode status
 *
 * Called once on app launch and cached for 5 minutes.
 */

interface MobileConfig {
  minVersion: { android: string; ios: string };
  latestVersion: { android: string; ios: string };
  forceUpdate: boolean;
  maintenance: { active: boolean; message?: string; estimatedEnd?: string };
  features: Record<string, boolean>;
  websocketUrl: string;
  apiVersion: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform') || 'android';
  const clientVersion = url.searchParams.get('version') || '0.0.0';

  // Version requirements — update these when shipping breaking changes
  const MIN_ANDROID_VERSION = process.env.MIN_ANDROID_VERSION || '1.0.0';
  const MIN_IOS_VERSION = process.env.MIN_IOS_VERSION || '1.0.0';
  const LATEST_ANDROID_VERSION = process.env.LATEST_ANDROID_VERSION || '1.0.0';
  const LATEST_IOS_VERSION = process.env.LATEST_IOS_VERSION || '1.0.0';

  const minVersion = platform === 'ios' ? MIN_IOS_VERSION : MIN_ANDROID_VERSION;
  const needsUpdate = compareVersions(clientVersion, minVersion) < 0;

  const config: MobileConfig = {
    minVersion: { android: MIN_ANDROID_VERSION, ios: MIN_IOS_VERSION },
    latestVersion: { android: LATEST_ANDROID_VERSION, ios: LATEST_IOS_VERSION },
    forceUpdate: needsUpdate,
    maintenance: {
      active: process.env.MAINTENANCE_MODE === 'true',
      message: process.env.MAINTENANCE_MESSAGE || undefined,
      estimatedEnd: process.env.MAINTENANCE_END || undefined,
    },
    features: {
      multiplayer: true,
      adventure: true,
      blast: true,
      daily: true,
      education: process.env.FEATURE_EDUCATION !== 'false',
      ranked: process.env.FEATURE_RANKED !== 'false',
      customPuzzles: true,
    },
    websocketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || '',
    apiVersion: '1',
  };

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}

/** Compare semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}
