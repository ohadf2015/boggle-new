import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/getBearerUser', () => ({ getBearerUser: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { getBearerUser } from '@/lib/auth/getBearerUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { POST } from './route';

/** Build an admin-client mock whose upsert records its args and returns `error`. */
function mockAdmin(error: { message: string } | null = null) {
  const upsert = vi.fn(async () => ({ error }));
  const from = vi.fn(() => ({ upsert }));
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
  return { from, upsert };
}

const post = (body: unknown, auth = true) =>
  POST(
    new NextRequest('http://localhost/api/growth/churn-signals', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { Authorization: 'Bearer token' } : {}),
      },
      body: JSON.stringify(body),
    })
  );

const validPayload = {
  userId: 'user-1',
  avgSessionLengthSeconds: 30,
  gamesPerSession: 0,
  socialInteractions: 0,
  notificationDismissals: 5,
};

describe('POST /api/growth/churn-signals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Auth seam: getBearerUser resolves to user-1 by default. Re-applied after
    // clearAllMocks (which wipes mock implementations).
    vi.mocked(getBearerUser).mockResolvedValue({ id: 'user-1' });
  });

  it('returns 401 when the request is unauthenticated', async () => {
    vi.mocked(getBearerUser).mockResolvedValue(null);
    mockAdmin();
    const res = await post(validPayload, false);
    expect(res.status).toBe(401);
  });

  it('upserts using real table columns, not player_id/signals', async () => {
    const { from, upsert } = mockAdmin();
    const res = await post(validPayload);
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith('churn_signals');

    const [row, options] = upsert.mock.calls[0];
    // Must use the real schema columns from migration 20260322700000.
    expect(row).toMatchObject({
      user_id: 'user-1',
      avg_session_length_seconds: 30,
      games_per_session: 0,
      social_interactions: 0,
      notification_dismissals: 5,
    });
    // Must NOT use the non-existent columns that caused the 500.
    expect(row).not.toHaveProperty('player_id');
    expect(row).not.toHaveProperty('signals');
    expect(row).not.toHaveProperty('updated_at');
    // Conflict target must match the table's UNIQUE (user_id, signal_date).
    expect(options).toEqual({ onConflict: 'user_id,signal_date' });
  });

  it('computes an elevated risk score from disengagement signals', async () => {
    mockAdmin();
    const res = await post(validPayload);
    const body = await res.json();
    // 0 games (+15) + 0 social (+20) + >3 dismissals (+15) + short session (+20) = 70 → high.
    expect(body.riskScore).toBe(70);
    expect(body.riskLevel).toBe('high');
  });

  it('computes a low risk score for an engaged session', async () => {
    mockAdmin();
    const res = await post({
      userId: 'user-1',
      avgSessionLengthSeconds: 600,
      gamesPerSession: 5,
      socialInteractions: 3,
      notificationDismissals: 0,
    });
    const body = await res.json();
    expect(body.riskScore).toBe(0);
    expect(body.riskLevel).toBe('low');
  });

  it('returns 500 when the upsert fails', async () => {
    mockAdmin({ message: 'boom' });
    const res = await post(validPayload);
    expect(res.status).toBe(500);
  });
});
