import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));
vi.mock('next/server', () => ({
  NextResponse: { json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(),
}));

import { GET } from '../route';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

const mockCreateClient = createClient as any;
const mockGetAuthedUser = getAuthedUser as any;

const req = () =>
  ({ url: 'https://www.lexiclash.live/api/events' } as any);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated. Individual tests override for the unauth case.
  mockGetAuthedUser.mockResolvedValue({ id: 'user-123' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/events', () => {
  it('returns empty arrays on successful query with no events', async () => {
    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      auth: {
        getUser: vi.fn(() => ({ data: { user: { id: 'user-123' } } })),
      },
    });

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ active: [], upcoming: [], myEvents: [] });
  });

  it('returns all three arrays with sample events', async () => {
    const activeEvent = { id: '1', name: 'Active', status: 'active', start_time: '2026-01-01T00:00:00Z', end_time: '2026-01-02T00:00:00Z', description: '', type: 'battle', config: null, rewards: null };
    const upcomingEvent = { id: '2', name: 'Upcoming', status: 'upcoming', start_time: '2026-02-01T00:00:00Z', end_time: '2026-02-02T00:00:00Z', description: '', type: 'battle', config: null, rewards: null };

    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [activeEvent, upcomingEvent], error: null })),
          })),
          eq: vi.fn(() => Promise.resolve({ data: [{ event_id: '1' }], error: null })),
        })),
      })),
      auth: {
        getUser: vi.fn(() => ({ data: { user: { id: 'user-123' } } })),
      },
    });

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.active).toHaveLength(1);
    expect(body.upcoming).toHaveLength(1);
    expect(body.myEvents).toHaveLength(1);
  });

  it('returns default empty arrays on database error', async () => {
    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') })),
          })),
        })),
      })),
      auth: {
        getUser: vi.fn(() => ({ data: { user: { id: 'user-123' } } })),
      },
    });

    const res = await GET(req());
    const body = await res.json();
    expect(body).toEqual({ active: [], upcoming: [], myEvents: [] });
  });

  it('returns myEvents empty when user is not authenticated', async () => {
    mockGetAuthedUser.mockResolvedValueOnce(null);
    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      auth: {
        getUser: vi.fn(() => ({ data: { user: null } })),
      },
    });

    const res = await GET(req());
    const body = await res.json();
    expect(body.myEvents).toEqual([]);
    expect(body.active).toEqual([]);
    expect(body.upcoming).toEqual([]);
  });
});
