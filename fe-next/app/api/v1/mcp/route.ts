/**
 * POST /api/v1/mcp — stateless MCP (streamable HTTP, JSON responses) for the Daily Challenge.
 * Read-only: no auth, no score submission. Tools wrap existing routes/libs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildPublicDailyPuzzle, buildShareResult, isPublicLanguage, parseDailyDate } from '@/lib/api/v1/publicDaily';
import { POST as validateWord } from '@/app/api/validate-word/route';
import { GET as dailyLeaderboard } from '@/app/api/daily/leaderboard/route';

export const runtime = 'nodejs';

const CORS = { 'Access-Control-Allow-Origin': '*' };
const lang = { type: 'string', enum: ['en', 'he', 'sv', 'ja', 'es', 'ru'], description: 'Language (default en)' };
const date = { type: 'string', description: 'YYYY-MM-DD, UTC (default today)' };

const TOOLS = [
  {
    name: 'get_daily_puzzle',
    description: 'Get the LexiClash Daily Challenge letter grid (same for every player). Find words by chaining adjacent letters. Today\'s answer is withheld; past dates include targetWord.',
    inputSchema: { type: 'object', properties: { date, language: lang } },
  },
  {
    name: 'check_word',
    description: 'Check whether a word is in the LexiClash dictionary.',
    inputSchema: { type: 'object', properties: { word: { type: 'string' }, language: lang }, required: ['word'] },
  },
  {
    name: 'daily_leaderboard',
    description: 'Daily Challenge leaderboard for a date.',
    inputSchema: { type: 'object', properties: { date, language: lang, limit: { type: 'number' } } },
  },
  {
    name: 'share_result',
    description: 'Build a share message and deep link so a human can play the same puzzle.',
    inputSchema: {
      type: 'object',
      properties: { date, language: lang, score: { type: 'number' }, words_found: { type: 'number' } },
      required: ['score', 'words_found'],
    },
  },
];

type Args = Record<string, unknown>;

async function callTool(name: string, args: Args): Promise<unknown> {
  const language = args.language ?? 'en';
  if (!isPublicLanguage(language)) throw new Error('invalid language');
  switch (name) {
    case 'get_daily_puzzle':
    case 'share_result': {
      const d = parseDailyDate(typeof args.date === 'string' ? args.date : null);
      if (!d) throw new Error('invalid date');
      if (name === 'get_daily_puzzle') return buildPublicDailyPuzzle(d, language);
      return buildShareResult({
        date: d,
        language,
        score: Number(args.score) || 0,
        wordsFound: Number(args.words_found) || 0,
      });
    }
    case 'check_word': {
      if (typeof args.word !== 'string') throw new Error('word required');
      const res = await validateWord(new NextRequest('http://localhost/api/validate-word', {
        method: 'POST',
        body: JSON.stringify({ word: args.word, language }),
      }));
      return res.json();
    }
    case 'daily_leaderboard': {
      const d = parseDailyDate(typeof args.date === 'string' ? args.date : null);
      if (!d) throw new Error('invalid date');
      const qs = new URLSearchParams({ date: d, lang: language, limit: String(Number(args.limit) || 10) });
      const res = await dailyLeaderboard(new NextRequest(`http://localhost/api/daily/leaderboard?${qs}`));
      return res.json();
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: CORS });
}
function fail(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: CORS });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let msg: { id?: unknown; method?: string; params?: { name?: string; arguments?: Args } };
  try {
    msg = await request.json();
  } catch {
    return fail(null, -32700, 'parse error');
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'lexiclash', version: '1.0.0' },
      });
    case 'notifications/initialized':
      return new NextResponse(null, { status: 202, headers: CORS });
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call':
      try {
        const out = await callTool(msg.params?.name ?? '', msg.params?.arguments ?? {});
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(out) }] });
      } catch (e) {
        return ok(id, { isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : 'error' }] });
      }
    default:
      return fail(id, -32601, 'method not found');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, mcp-protocol-version' },
  });
}
