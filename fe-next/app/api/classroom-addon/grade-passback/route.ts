/**
 * Classroom Marketplace grade passback API for #975 async miss-gap homework.
 * POST missed words + due → attachment (maxPoints) + studentSubmission patch body.
 * Never student names. OAuth patch deferred.
 */

import { NextResponse } from 'next/server';
import {
  buildMissGapGradePassback,
  missGapGradePassbackCorsHeaders,
} from '@/lib/education/missGapGradePassback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: missGapGradePassbackCorsHeaders(),
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      name: 'LexiClash miss-gap grade passback',
      grade_passback_path: '/api/classroom-addon/grade-passback',
      foil: 'Kahoot Marketplace grade passback',
      student_names: false,
      roster_scopes: false,
      oauth_required_for_grade_sync: true,
      instructions:
        'POST missed_words + due (YYYY-MM-DD) after homework complete to receive gradeReceiptUrl, attachment.maxPoints, and studentSubmission patch body for Classroom Grade sync.',
    },
    { status: 200, headers: missGapGradePassbackCorsHeaders() },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = buildMissGapGradePassback(body);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: missGapGradePassbackCorsHeaders(),
  });
}
