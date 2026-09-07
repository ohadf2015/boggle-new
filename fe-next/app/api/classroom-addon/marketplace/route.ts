/**
 * Google Workspace Marketplace listing metadata for the Classroom add-on.
 * Public JSON: https://www.lexiclash.live/api/classroom-addon/marketplace
 */

import { NextResponse } from 'next/server';
import {
  classroomAddonCorsHeaders,
  classroomAddonMarketplaceListing,
} from '@/lib/education/googleClassroomAddon';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: classroomAddonCorsHeaders() });
}

export function GET(): NextResponse {
  return NextResponse.json(classroomAddonMarketplaceListing(), {
    status: 200,
    headers: {
      ...classroomAddonCorsHeaders(),
      'Cache-Control': 'public, max-age=300',
    },
  });
}
