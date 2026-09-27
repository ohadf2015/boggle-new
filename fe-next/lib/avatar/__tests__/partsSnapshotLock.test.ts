/**
 * premium_avatar_parts is jsonb. postgrest-js `.eq(col, array)` serializes the
 * array as `eq.a,b` (or `eq.` when empty), which Postgres can't cast to jsonb —
 * every purchase errored, was refunded and returned 500. Built on a REAL
 * postgrest builder so the URL is what the server actually receives.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { lockOnPartsSnapshot } from '../partsSnapshotLock';

async function capturedUrl(parts: string[]): Promise<URL> {
  let url = '';
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    url = String(input);
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const client = createClient('http://db.test', 'anon', { global: { fetch: fetchSpy as unknown as typeof fetch } });
  await lockOnPartsSnapshot(client.from('profiles').update({ x: 1 }).eq('id', 'u1'), parts).select('id');
  return new URL(url);
}

describe('lockOnPartsSnapshot', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Given owned parts, When locking, Then the filter is a JSON array literal', async () => {
    const url = await capturedUrl(['hair:mohawk', 'eyes:laserEye']);
    expect(url.searchParams.get('premium_avatar_parts')).toBe('eq.["hair:mohawk","eyes:laserEye"]');
  });

  it('Given no parts yet, When locking, Then the filter is an empty JSON array, not an empty string', async () => {
    const url = await capturedUrl([]);
    expect(url.searchParams.get('premium_avatar_parts')).toBe('eq.[]');
  });
});
