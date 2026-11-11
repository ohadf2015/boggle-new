import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: async () => ({ allowed: true, currentCount: 0, limit: 50 }) }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: (locale: string) => `fun-${locale}` }));

import { POST } from '../route';

function post(name: string, referer = 'https://www.lexiclash.live/he/join/ABC123') {
  const req = new Request('http://localhost/api/education/guest-name', { method: 'POST', body: JSON.stringify({ name, joinCode: 'ABC123' }) });
  const headers = new Headers({ 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 200)}`, referer });
  Object.defineProperty(req, 'headers', { value: headers });
  return POST(req);
}

describe('POST /api/education/guest-name — names the class screen cannot show', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }));
  });

  it.each(['fuck face', 'זונה', 'pendejo', 'сука', 'Jävla'])(
    'Given the profane name %s, When checked, Then it is refused with NAME_NOT_ALLOWED and a fun name in the page language, before any lookup',
    async (name) => {
      const res = await post(name);
      expect(res.status).toBe(422);
      await expect(res.json()).resolves.toEqual({ available: false, code: 'NAME_NOT_ALLOWED', suggestedName: 'fun-he' });
      expect(mockFrom).not.toHaveBeenCalled();
    },
  );

  it('Given an ordinary name that contains a banned piece, When checked, Then it is not refused', async () => {
    const res = await post('Dickson');
    expect(res.status).toBe(200);
  });
});
