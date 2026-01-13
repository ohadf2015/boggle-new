/**
 * app-ads.txt Route Handler
 *
 * Serves the app-ads.txt file for mobile app advertising authorization.
 * This file follows the IAB Tech Lab's app-ads.txt specification
 * for declaring authorized sellers for in-app advertising inventory.
 *
 * IMPORTANT: This ensures app-ads.txt is ALWAYS available,
 * even if static file serving has issues in certain deployments.
 *
 * @see https://iabtechlab.com/app-ads-txt/
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Content from public/app-ads.txt
  const content = `# app-ads.txt - Authorized Digital Sellers for Apps
# LexiClash - Real-Time Multiplayer Word Strategy Game
# https://www.lexiclash.live
#
# This file declares authorized advertising partners.
# Replace the placeholder entries below with your actual ad network IDs.
#
# Format: <domain>, <publisher-id>, <relationship>, <certification-authority-id>
#
# Example entries (uncomment and replace with your actual IDs):
# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
# facebook.com, XXXXXXXXXXXXXXXX, DIRECT
# unity3d.com, XXXXXXXX, DIRECT
#
# For Google AdMob:
# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
#
# For AdSense:
# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
#
# Add your authorized advertising partners below this line:
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache for 24 hours - app-ads.txt rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
