import { describe, expect, it, vi } from 'vitest';
import { handleRpc, type McpDeps } from '../handler';

const deps: McpDeps = {
  today: () => '2026-11-28',
  createPuzzle: vi.fn(async () => ({ status: 200, json: { puzzleCode: 'abcd1234' } })),
  leaderboard: vi.fn(async () => ({ status: 200, json: { rows: [] } })),
};
const call = (name: string, args: Record<string, unknown> = {}) =>
  handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, deps);

describe('MCP handler', () => {
  it('lists the four tools', async () => {
    const r: any = await handleRpc({ id: 1, method: 'tools/list' }, deps);
    expect(r.result.tools.map((t: any) => t.name)).toEqual([
      'get_daily_puzzle',
      'create_challenge',
      'score_words',
      'daily_leaderboard',
    ]);
  });

  it('returns no body for notifications', async () => {
    expect(await handleRpc({ method: 'notifications/initialized' }, deps)).toBeNull();
  });

  it('scores words and zeroes duplicates', async () => {
    const r: any = await call('score_words', { words: ['cats', 'CATS', 'ab'] });
    const out = JSON.parse(r.result.content[0].text);
    expect(out.words.map((w: any) => w.points)).toEqual([30, 0, 0]);
    expect(out.total).toBe(30);
  });

  it('tags challenge links with src=mcp', async () => {
    const r: any = await call('create_challenge', { targetWord: 'cats', grid: [['c']], displayName: 'Bot' });
    expect(JSON.parse(r.result.content[0].text).url).toBe('https://www.lexiclash.live/en/custom/abcd1234?src=mcp');
  });

  it('errors on unknown tool and method', async () => {
    expect(((await call('nope')) as any).error.code).toBe(-32602);
    expect(((await handleRpc({ id: 2, method: 'x' }, deps)) as any).error.code).toBe(-32601);
  });
});
