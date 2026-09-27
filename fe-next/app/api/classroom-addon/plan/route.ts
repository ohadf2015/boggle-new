/**
 * Classroom Marketplace conversational planner API.
 * POST plain-language prompt (+ optional missed words / CEFR) → routed Live + grade passback.
 * Foils Discovery Education Gemini conversational Classroom. Class-level only.
 */

import { NextResponse } from 'next/server';
import {
  CLASSROOM_ADDON_PLAN_API_PATH,
  buildClassroomAddonPlan,
} from '@/lib/education/classroomAddonPlanner';
import { classroomAddonCorsHeaders } from '@/lib/education/googleClassroomAddon';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: classroomAddonCorsHeaders() });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      name: 'LexiClash Classroom conversational planner',
      plan_path: CLASSROOM_ADDON_PLAN_API_PATH,
      foil: 'Discovery Education Gemini conversational Classroom',
      student_names: false,
      example_prompts: [
        "Unplugged reteach on yesterday's misses",
        '3-min Live on CEFR gaps',
        'Classic Unplugged with the class',
        'Team Tiles for two groups',
      ],
      instructions:
        'POST prompt (and optional missed_words / cefr / lesson / locale). Routes into Classic/Team Unplugged or reteach Live + grade passback. Never send student names.',
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
  const result = buildClassroomAddonPlan(body);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: classroomAddonCorsHeaders(),
  });
}
