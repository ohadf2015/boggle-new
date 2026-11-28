import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { handleRpc, type McpDeps, type RpcMessage } from '@/lib/mcp/handler';
import { getDailyChallengeDate } from '@/utils/dailyChallenge';
import { POST as createPuzzlePost } from '@/app/api/custom-puzzle/create/route';
import { GET as leaderboardGet } from '@/app/api/daily/leaderboard/route';

const RATE = { maxRequests: 60, windowMs: 60_000 };

function depsFor(request: NextRequest): McpDeps {
  return {
    today: getDailyChallengeDate,
    createPuzzle: async (body) => {
      const res = await createPuzzlePost(
        new Request(new URL('/api/custom-puzzle/create', request.url), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      return { status: res.status, json: await res.json() };
    },
    leaderboard: async (date, language, limit) => {
      const url = new URL('/api/daily/leaderboard', request.url);
      url.search = new URLSearchParams({ date, lang: language, limit: String(limit) }).toString();
      const res = await leaderboardGet(new NextRequest(url));
      return { status: res.status, json: await res.json() };
    },
  };
}

/** MCP streamable-HTTP endpoint (stateless, JSON responses). */
export async function POST(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'mcp', RATE);
  if (!limit.success) return rateLimitResponse(limit);

  let body: RpcMessage | RpcMessage[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  const deps = depsFor(request);
  const batch = Array.isArray(body);
  const replies = (await Promise.all((Array.isArray(body) ? body : [body]).map((m) => handleRpc(m ?? {}, deps)))).filter(Boolean);
  if (replies.length === 0) return new NextResponse(null, { status: 202 });
  return NextResponse.json(batch ? replies : replies[0]);
}

export async function GET() {
  return new NextResponse('Use POST with JSON-RPC (MCP streamable HTTP).', { status: 405, headers: { Allow: 'POST' } });
}
