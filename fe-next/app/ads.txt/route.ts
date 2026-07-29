/**
 * ads.txt Route Handler
 *
 * Serves the ads.txt file for advertising authorization.
 * This file follows the IAB Tech Lab's ads.txt specification
 * to declare authorized digital sellers for advertising inventory.
 *
 * IMPORTANT: This ensures ads.txt is ALWAYS available,
 * even if static file serving has issues in certain deployments.
 *
 * @see https://iabtechlab.com/ads-txt/
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const content = `google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache for 24 hours - ads.txt rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
