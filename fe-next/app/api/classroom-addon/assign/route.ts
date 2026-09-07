/**
 * Classroom Marketplace assign API — returns #968 Stream share URL + attachment URIs.
 * POST missed words (class-level only). Never student names.
 */

import { NextResponse } from 'next/server';
import {
  buildClassroomAddonAssign,
  classroomAddonCorsHeaders,
} from '@/lib/education/googleClassroomAddon';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: classroomAddonCorsHeaders() });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      name: 'LexiClash Classroom Marketplace assign',
      assign_path: '/api/classroom-addon/assign',
      marketplace_path: '/api/classroom-addon/marketplace',
      student_names: false,
      instructions:
        'POST missed_words (and optional lesson/locale) to receive streamAssignUrl (#968 Unplugged homework) plus teacher/student attachment URIs.',
    },
    { status: 200, headers: classroomAddonCorsHeaders() },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = buildClassroomAddonAssign(body);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: classroomAddonCorsHeaders(),
  });
}
