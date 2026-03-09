/**
 * Android Digital Asset Links
 * Serves assetlinks.json for Android App Links verification
 * Must be at /.well-known/assetlinks.json with Content-Type: application/json
 */

import { NextResponse } from 'next/server';

const PACKAGE_NAME = 'live.lexiclash.app';

export async function GET() {
  const sha256Cert = process.env.ANDROID_SHA256_CERT || '';

  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: [sha256Cert],
      },
    },
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
