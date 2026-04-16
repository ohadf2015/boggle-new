import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Supabase mock (chainable builder) ──────────────────────────────
// Returns itself for every chained method, with terminal methods mocked separately.
function createChainMock() {
  const terminal = { single: vi.fn(), then: undefined as unknown };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'single') return terminal.single;
      if (prop === 'then') return undefined; // not a thenable
      if (!chain[prop]) chain[prop] = vi.fn(() => new Proxy({}, handler));
      return chain[prop];
    },
  };
  const proxy = new Proxy({}, handler) as Record<string, ReturnType<typeof vi.fn>>;
  return { proxy, chain, terminal };
}

let profilesChain = createChainMock();
let subscribersChain = createChainMock();

const mockFrom = vi.fn((table: string) => {
  if (table === 'email_subscribers') return subscribersChain.proxy;
  return profilesChain.proxy;
});

const mockSupabase = { from: mockFrom };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fake-key');

vi.mock('@/backend/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { unsubscribeByToken, getSubscriberRecipients } from '../email';

// ── unsubscribeByToken ─────────────────────────────────────────────
describe('unsubscribeByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesChain = createChainMock();
    subscribersChain = createChainMock();
  });

  it('unsubscribes a profile user when token matches in profiles', async () => {
    profilesChain.terminal.single.mockResolvedValue({ data: { id: 'user-1' }, error: null });

    const result = await unsubscribeByToken('valid-profile-token');

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockFrom).not.toHaveBeenCalledWith('email_subscribers');
  });

  it('falls back to email_subscribers when token not in profiles', async () => {
    profilesChain.terminal.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    // subscriber select resolves with data array (no .single())
    subscribersChain.chain.select = vi.fn().mockResolvedValue({
      data: [{ email: 'sub@test.com' }],
      error: null,
    });

    const result = await unsubscribeByToken('subscriber-token');

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockFrom).toHaveBeenCalledWith('email_subscribers');
  });

  it('returns error when token not found in either table', async () => {
    profilesChain.terminal.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    subscribersChain.chain.select = vi.fn().mockResolvedValue({ data: [], error: null });

    const result = await unsubscribeByToken('unknown-token');

    expect(result).toEqual({ success: false, error: 'Invalid or expired unsubscribe link' });
  });

  it('returns error when supabase not configured', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await unsubscribeByToken('any-token');
    expect(result).toEqual({ success: false, error: 'Database not configured' });

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });
});

// ── getSubscriberRecipients ────────────────────────────────────────
describe('getSubscriberRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesChain = createChainMock();
    subscribersChain = createChainMock();
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  it('returns active subscribers excluding registered user emails', async () => {
    subscribersChain.chain.or = vi.fn().mockResolvedValue({
      data: [
        { id: 1, email: 'new@test.com', language: 'en', unsubscribe_token: 'tok-1', last_campaign_email_sent_at: thirtyDaysAgo },
        { id: 2, email: 'registered@test.com', language: 'he', unsubscribe_token: 'tok-2', last_campaign_email_sent_at: null },
      ],
      error: null,
    });

    const registeredEmails = new Set(['registered@test.com']);
    const result = await getSubscriberRecipients(registeredEmails);

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('new@test.com');
    expect(result[0].language).toBe('en');
    expect(result[0].unsubscribe_token).toBe('tok-1');
  });

  it('returns empty array when all subscribers are registered users', async () => {
    subscribersChain.chain.or = vi.fn().mockResolvedValue({
      data: [
        { id: 1, email: 'user1@test.com', language: 'en', unsubscribe_token: 'tok-1', last_campaign_email_sent_at: null },
      ],
      error: null,
    });

    const registeredEmails = new Set(['user1@test.com']);
    const result = await getSubscriberRecipients(registeredEmails);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no subscribers found', async () => {
    subscribersChain.chain.or = vi.fn().mockResolvedValue({ data: [], error: null });

    const result = await getSubscriberRecipients(new Set());
    expect(result).toHaveLength(0);
  });

  it('returns empty array on DB error', async () => {
    subscribersChain.chain.or = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB down' },
    });

    const result = await getSubscriberRecipients(new Set());
    expect(result).toHaveLength(0);
  });

  it('returns empty array when supabase not configured', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await getSubscriberRecipients(new Set());
    expect(result).toHaveLength(0);

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });
});
