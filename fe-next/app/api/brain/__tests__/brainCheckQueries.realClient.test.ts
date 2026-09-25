/**
 * The Brain Check queries built on a REAL supabase-js client (fetch captured),
 * not a mocked chain — mocked chains once hid a jsonb filter that never matched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const urls: string[] = [];
const realClient = () =>
  createClient('https://proj.supabase.co', 'anon-key', {
    global: {
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = decodeURIComponent(String(input));
        urls.push(`${init?.method ?? 'GET'} ${url}`);
        const body = init?.method === 'POST' ? { id: 'sess-1' } : [];
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    },
  });

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => null }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/dailyMissionsManager', () => ({ completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/shared/dailyQuestPool', () => ({ emptyQuestResult: vi.fn((r) => r) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn().mockResolvedValue({ id: 'u1' }) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => realClient() }));

import { processBrainDrillCompletion } from '../../drills/submit/processCompletion';
import { GET } from '../checks/route';

beforeEach(() => { urls.length = 0; });

describe('Brain Check queries on a real client', () => {
  it('GET /api/brain/checks filters benchmark rows as jsonb text = true, for the 4 measured drills', async () => {
    const res = await GET(new Request('http://x/api/brain/checks'));
    expect(res.status).toBe(200);
    const q = urls.find((u) => u.includes('/drill_sessions'))!;
    expect(q).toContain('extra_data->>benchmark=eq.true');
    expect(q).toContain('drill_type=in.(lightning-round,memory-hunt,combo-master,rare-gems)');
    expect(q).toContain('user_id=eq.u1');
  });

  it('submit: the cooldown lookup is a dedicated time-bounded benchmark query', async () => {
    await processBrainDrillCompletion(
      { drillType: 'lightning-round', level: 1, score: 50, durationSeconds: 60, wordsFound: 8, extraData: { benchmark: true } },
      'u1', '', { supabase: realClient(), source: 'live' },
    );
    const cooldown = urls.find((u) => u.startsWith('GET') && u.includes('extra_data->>benchmark=eq.true'))!;
    expect(cooldown).toMatch(/created_at=gte\.\d{4}-\d{2}-\d{2}T/);
    expect(cooldown).toContain('drill_type=eq.lightning-round');
    const insert = urls.find((u) => u.startsWith('POST') && u.includes('/drill_sessions'));
    expect(insert).toBeTruthy();
  });
});
