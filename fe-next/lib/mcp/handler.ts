/**
 * Minimal stateless MCP (streamable HTTP, JSON responses) JSON-RPC dispatcher.
 */
import { MCP_TOOLS, getDailyPuzzle, scoreWords, challengeUrl, dailyPlayUrl, DATE_RE } from './tools';

type Json = Record<string, unknown>;
export interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Json;
}

/** Site-internal calls, injected so tests don't need Supabase. */
export interface McpDeps {
  createPuzzle(body: Json): Promise<{ status: number; json: Json }>;
  leaderboard(date: string, language: string, limit: number): Promise<{ status: number; json: Json }>;
  today(): string;
}

const ok = (id: RpcMessage['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const err = (id: RpcMessage['id'], code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});
const text = (data: unknown, isError = false) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], isError });

async function callTool(name: string, args: Json, deps: McpDeps) {
  try {
    switch (name) {
      case 'get_daily_puzzle':
        return text(getDailyPuzzle(args));
      case 'score_words':
        return text(scoreWords(args));
      case 'create_challenge': {
        const language = typeof args.language === 'string' ? args.language : 'en';
        const r = await deps.createPuzzle(Object.assign({}, args, { language }));
        if (r.status !== 200) return text(r.json, true);
        return text({ puzzleCode: r.json.puzzleCode, url: challengeUrl(String(r.json.puzzleCode), language) });
      }
      case 'daily_leaderboard': {
        const date = typeof args.date === 'string' && DATE_RE.test(args.date) ? args.date : deps.today();
        const language = typeof args.language === 'string' ? args.language : 'en';
        const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
        const r = await deps.leaderboard(date, language, limit);
        if (r.status !== 200) return text(r.json, true);
        return text(Object.assign({}, r.json, { playUrl: dailyPlayUrl(language) }));
      }
      default:
        return null;
    }
  } catch (e) {
    return text({ error: e instanceof Error ? e.message : 'tool failed' }, true);
  }
}

/** Returns null for notifications (no response body). */
export async function handleRpc(msg: RpcMessage, deps: McpDeps) {
  const { id, method } = msg;
  if (typeof method !== 'string') return err(id, -32600, 'Invalid Request');
  if (method.startsWith('notifications/')) return null;
  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'lexiclash', version: '1.0.0' },
      });
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: MCP_TOOLS });
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const result = await callTool(name, (msg.params?.arguments as Json) ?? {}, deps);
      return result ? ok(id, result) : err(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}
