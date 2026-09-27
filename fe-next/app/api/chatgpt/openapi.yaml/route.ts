/**
 * ChatGPT custom GPT Action schema (OpenAPI 3.0.1).
 * Import URL: https://www.lexiclash.live/api/chatgpt/openapi.yaml
 */

import { NextResponse } from 'next/server';
import { chatgptActionOpenApiYaml, chatgptCorsHeaders } from '@/lib/education/chatgptReteach';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: chatgptCorsHeaders() });
}

export function GET(): NextResponse {
  return new NextResponse(chatgptActionOpenApiYaml(), {
    status: 200,
    headers: {
      ...chatgptCorsHeaders(),
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
