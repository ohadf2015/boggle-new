/**
 * ChatGPT Action endpoint: create or host a 3-min reteach Live.
 *
 * Public, CORS-open, no auth — ChatGPT calls this from a custom GPT Action.
 * Class-level missed words only. No student accounts or names.
 */

import { NextResponse } from 'next/server';
import {
  CHATGPT_RETEACH_TIMER_SECONDS,
  buildChatGptReteach,
  chatgptCorsHeaders,
} from '@/lib/education/chatgptReteach';
import { CLASS_GAP_ORIGIN } from '@/lib/education/classGapShare';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OPENAPI_URL = `${CLASS_GAP_ORIGIN}/api/chatgpt/openapi.yaml`;

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: chatgptCorsHeaders() });
}

export function GET(): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      openapi_url: OPENAPI_URL,
      usage:
        'POST missed_words (or words) plus optional lesson, locale, action=create|host. Do not send student names.',
      timer_seconds: CHATGPT_RETEACH_TIMER_SECONDS,
      student_accounts: false,
      student_names: false,
    },
    { headers: chatgptCorsHeaders() },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const result = buildChatGptReteach(body);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: chatgptCorsHeaders(),
  });
}
