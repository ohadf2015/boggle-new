import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn((url: string, key: string) => ({ url, key })));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));
vi.mock('@/backend/utils/logger', () => ({ default: { error: vi.fn() } }));

import { getSupabaseAdmin } from '../../admin/server';

describe('getSupabaseAdmin', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-a';
  });

  it('hands every caller the same service-role client', () => {
    const first = getSupabaseAdmin();
    const second = getSupabaseAdmin();
    expect(second).toBe(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when the service key is not configured', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(getSupabaseAdmin()).toBeNull();
  });
});
