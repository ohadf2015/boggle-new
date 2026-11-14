// @vitest-environment node
/**
 * PostHog inbox 01a1c16a: an empty POST body threw "Unexpected end of JSON
 * input", was captured as a server error and answered 500. Bad bodies are a
 * client mistake: answer 400 and keep them out of error tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const captureApiError = vi.fn();
const buildQuickRound = vi.fn();

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: (...a: unknown[]) => captureApiError(...a) }));
vi.mock('@/backend/modules/quickPlayRound', () => ({ buildQuickRound: (...a: unknown[]) => buildQuickRound(...a) }));
vi.mock('@/lib/quickPlay/fetchGhostRivals', () => ({ fetchGhostRivals: async () => [] }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

import { POST } from '../route';

const post = (body?: string) =>
  new NextRequest('http://localhost/api/quick-play/round', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  captureApiError.mockClear();
  buildQuickRound.mockReset();
  buildQuickRound.mockResolvedValue({ seed: 's', words: ['a', 'b'] });
});

describe('POST /api/quick-play/round body guard', () => {
  it.each([
    ['empty body', undefined],
    ['truncated JSON', '{"mode":"cla'],
    ['JSON null', 'null'],
    ['JSON array', '[]'],
  ])('answers 400 without capturing on %s', async (_label, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(captureApiError).not.toHaveBeenCalled();
    expect(buildQuickRound).not.toHaveBeenCalled();
  });

  it('still builds a round for a valid body', async () => {
    const res = await POST(post(JSON.stringify({ mode: 'classic', language: 'en' })));
    expect(res.status).toBe(200);
    expect(buildQuickRound).toHaveBeenCalledWith('classic', 'en', undefined);
  });
});
