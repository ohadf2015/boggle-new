/**
 * Classroom Marketplace grade passback API for Unplugged reteach Live completion.
 * POST missed words + cleared/total → attachment (maxPoints) + studentSubmission patch body.
 * Never student names. OAuth patch deferred. Complements #977 miss-gap homework passback.
 */

import { NextResponse } from 'next/server';
import {
  buildUnpluggedGradePassback,
  unpluggedGradePassbackCorsHeaders,
} from '@/lib/education/unpluggedReteachGradePassback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: unpluggedGradePassbackCorsHeaders(),
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      name: 'LexiClash Unplugged reteach grade passback',
      grade_passback_path: '/api/classroom-addon/unplugged-grade-passback',
      foil: 'Kahoot Classroom add-on grade passback',
      complements: '/api/classroom-addon/grade-passback',
      student_names: false,
      roster_scopes: false,
      oauth_required_for_grade_sync: true,
      instructions:
        'POST missed_words + cleared + total after Unplugged Live finish to receive gradeReceiptUrl, attachment.maxPoints, and studentSubmission patch body for Classroom Grade sync.',
    },
    { status: 200, headers: unpluggedGradePassbackCorsHeaders() },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = buildUnpluggedGradePassback(body);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: unpluggedGradePassbackCorsHeaders(),
  });
}
