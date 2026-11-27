import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

async function rpc(body: unknown) {
  const res = await POST(new NextRequest('http://localhost/api/v1/mcp', { method: 'POST', body: JSON.stringify(body) }));
  return res.json();
}

describe('POST /api/v1/mcp', () => {
  it('lists the four tools', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(r.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'get_daily_puzzle', 'check_word', 'daily_leaderboard', 'share_result',
    ]);
  });

  it('initializes', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(r.result.serverInfo.name).toBe('lexiclash');
  });

  it('get_daily_puzzle returns a grid without the answer', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_daily_puzzle', arguments: {} } });
    const out = JSON.parse(r.result.content[0].text);
    expect(out.grid.length).toBeGreaterThan(0);
    expect(out.targetWord).toBeUndefined();
  });

  it('share_result returns a ref=agent link', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'share_result', arguments: { score: 3, words_found: 2 } } });
    expect(JSON.parse(r.result.content[0].text).url).toContain('ref=agent');
  });

  it('errors on unknown method', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 4, method: 'nope' });
    expect(r.error.code).toBe(-32601);
  });
});
