import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn((url: string, key: string) => ({ url, key })));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));
vi.mock('@/backend/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn() } }));

import { getSupabaseAdmin } from '../../admin/server';
import { createServiceClient } from '../../ai-service/client';

describe('getSupabaseAdmin', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-a');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('hands every caller the same service-role client', () => {
    const first = getSupabaseAdmin();
    const second = getSupabaseAdmin();
    expect(second).toBe(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('gives the AI word jobs the same client', () => {
    expect(createServiceClient()).toBe(getSupabaseAdmin());
  });

  it('returns null when the service key is not configured', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(getSupabaseAdmin()).toBeNull();
    expect(createServiceClient()).toBeNull();
  });
});
