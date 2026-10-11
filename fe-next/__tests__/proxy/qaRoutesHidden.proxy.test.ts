import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
  })),
}));

const { proxy } = await import('../../proxy');

const req = (path: string) => new NextRequest(`https://www.lexiclash.live${path}`);
const rewriteTarget = (res: Response) => res.headers.get('x-middleware-rewrite') ?? '';

describe('proxy hides QA harness routes in production', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rewrites a QA route to an unmatched path so the response is a real 404', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await proxy(req('/he/avatar-test?level=3'));
    expect(rewriteTarget(res)).toMatch(/^https:\/\/www\.lexiclash\.live\/he\/__qa-route-disabled$/);
  });

  it('lets the harness through when ENABLE_QA_ROUTES=1', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_QA_ROUTES', '1');
    const res = await proxy(req('/en/comeback-test'));
    expect(rewriteTarget(res)).toBe('');
  });

  it('leaves other pages untouched in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await proxy(req('/en/word-tower'));
    expect(rewriteTarget(res)).toBe('');
  });
});
