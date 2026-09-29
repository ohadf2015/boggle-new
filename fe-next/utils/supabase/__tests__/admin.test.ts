import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.fn((_url: string, _key: string, _opts: any) => ({ __admin: true }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, opts: any) => createClientMock(url, key, opts),
}));

const URL = 'https://proj.supabase.co';
const KEY = 'service-role-key-abc123';

// The module caches a singleton, so re-import fresh per test.
async function loadAdmin() {
  vi.resetModules();
  return await import('@/utils/supabase/admin');
}

describe('createAdminClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = KEY;
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns null when the service key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createAdminClient } = await loadAdmin();
    expect(createAdminClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns null for a placeholder key', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';
    const { createAdminClient } = await loadAdmin();
    expect(createAdminClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('creates the client with the configured key', async () => {
    const { createAdminClient } = await loadAdmin();
    expect(createAdminClient()).not.toBeNull();
    expect(createClientMock).toHaveBeenCalledWith(URL, KEY, expect.objectContaining({
      auth: { autoRefreshToken: false, persistSession: false },
    }));
  });

  it('trims stray whitespace/newlines from the pasted key before creating the client', async () => {
    // Keys pasted into hosting env dashboards often carry a trailing newline;
    // the placeholder check trims, but the client must be built from the
    // trimmed value too — an untrimmed key sends a malformed apikey header
    // and every admin call 401s (the access-request approve 500).
    process.env.SUPABASE_SERVICE_ROLE_KEY = KEY + '\n';
    const { createAdminClient } = await loadAdmin();
    expect(createAdminClient()).not.toBeNull();
    expect(createClientMock).toHaveBeenCalledWith(URL, KEY, expect.anything());
  });

  it('trims stray whitespace from the URL as well', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL + ' ';
    const { createAdminClient } = await loadAdmin();
    expect(createAdminClient()).not.toBeNull();
    expect(createClientMock).toHaveBeenCalledWith(URL, KEY, expect.anything());
  });
});
