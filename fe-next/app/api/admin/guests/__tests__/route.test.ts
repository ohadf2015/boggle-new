import { vi, type Mock, describe, beforeEach, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers = { get: () => null };
    constructor(url: string) {
      this.url = url;
    }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

const mockVerifyAdminAuth = verifyAdminAuth as Mock;
const mockGetSupabaseAdmin = getSupabaseAdmin as Mock;

function buildSupabaseMock(rows: {
  guest_sessions?: unknown[];
  game_sessions?: unknown[];
  daily_word_hunt_attempts?: unknown[];
  daily_puzzle_attempts?: unknown[];
}) {
  const tableState: Record<string, { data: unknown[]; error: null }> = {
    guest_sessions: { data: rows.guest_sessions || [], error: null },
    game_sessions: { data: rows.game_sessions || [], error: null },
    daily_word_hunt_attempts: { data: rows.daily_word_hunt_attempts || [], error: null },
    daily_puzzle_attempts: { data: rows.daily_puzzle_attempts || [], error: null },
  };

  function makeQuery(table: string) {
    const result = tableState[table];
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      // limit() is the awaited terminator for our queries
      limit: vi.fn(() => Promise.resolve(result)),
      // Allow direct await after select chain (no limit) for fallback
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return builder;
  }

  return {
    from: vi.fn((table: string) => makeQuery(table)),
  };
}

describe('GET /api/admin/guests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      success: false,
      response: {
        json: () => Promise.resolve({ error: 'Unauthorized' }),
        status: 401,
      },
    });

    const request = new NextRequest('http://localhost/api/admin/guests') as unknown as import('next/server').NextRequest;
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 500 when database not configured', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(null);

    const request = new NextRequest('http://localhost/api/admin/guests') as unknown as import('next/server').NextRequest;
    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it('aggregates per-guest stats across all game tables', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });

    const guestRow = {
      session_id: 'guest-abc',
      device_type: 'mobile',
      browser: 'Chrome',
      language: 'en',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
      referrer: 'https://google.com/',
      country: 'US',
      first_visit_at: '2026-05-01T10:00:00Z',
      last_visit_at: '2026-05-09T12:00:00Z',
      user_id: null,
      linked_at: null,
      created_at: '2026-05-01T10:00:00Z',
    };

    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        guest_sessions: [guestRow],
        game_sessions: [
          {
            guest_session_id: 'guest-abc',
            score: 100,
            duration_seconds: 60,
            words_found: [{ word: 'cat' }, { word: 'house' }],
            mode: 'singleplayer',
            language: 'en',
            started_at: '2026-05-09T11:00:00Z',
            completed: true,
          },
        ],
        daily_word_hunt_attempts: [
          {
            guest_fingerprint: 'guest-abc',
            efficiency_score: 50,
            language: 'en',
            solved: true,
            created_at: '2026-05-09T11:30:00Z',
          },
        ],
        daily_puzzle_attempts: [
          {
            guest_fingerprint: 'guest-abc',
            score: 200,
            word_count: 5,
            language: 'en',
            completed_at: '2026-05-09T12:00:00Z',
          },
        ],
      }),
    );

    const request = new NextRequest('http://localhost/api/admin/guests') as unknown as import('next/server').NextRequest;
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.guests).toHaveLength(1);
    const guest = body.guests[0];
    expect(guest.session_id).toBe('guest-abc');
    expect(guest.total_games).toBe(3);
    expect(guest.multiplayer_games).toBe(1);
    expect(guest.word_hunt_games).toBe(1);
    expect(guest.daily_challenge_games).toBe(1);
    expect(guest.total_score).toBe(350);
    expect(guest.total_words).toBe(7); // 2 from game_sessions + 5 from daily puzzle
    expect(guest.longest_word).toBe('house');
    expect(guest.utm_source).toBe('google');
    expect(guest.country).toBe('US');
    expect(guest.converted).toBe(false);

    expect(body.stats.totalGuests).toBe(1);
    expect(body.stats.guestsWhoPlayed).toBe(1);
    expect(body.stats.totalGames).toBe(3);
    expect(body.stats.convertedGuests).toBe(0);
  });

  it('marks guest as converted when user_id is set', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        guest_sessions: [
          {
            session_id: 'guest-converted',
            device_type: null,
            browser: null,
            language: 'en',
            utm_source: null,
            utm_medium: null,
            utm_campaign: null,
            referrer: null,
            country: null,
            first_visit_at: '2026-05-01T10:00:00Z',
            last_visit_at: '2026-05-09T12:00:00Z',
            user_id: 'user-123',
            linked_at: '2026-05-05T10:00:00Z',
            created_at: '2026-05-01T10:00:00Z',
          },
        ],
      }),
    );

    const request = new NextRequest('http://localhost/api/admin/guests') as unknown as import('next/server').NextRequest;
    const response = await GET(request);
    const body = await response.json();

    expect(body.guests[0].converted).toBe(true);
    expect(body.guests[0].converted_user_id).toBe('user-123');
    expect(body.guests[0].converted_at).toBe('2026-05-05T10:00:00Z');
    expect(body.stats.convertedGuests).toBe(1);
    expect(body.stats.conversionRate).toBe(1);
  });
});
