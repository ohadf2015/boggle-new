// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  findUserByExternalIdentity,
  hashEmail,
  isIdentityLinkingEnabled,
  linkExternalIdentity,
  listLinkedIdentities,
  providerFromSupabase,
} from '../externalIdentity';

vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

// sha256 of 'student@school.org', computed with `printf %s student@school.org | shasum -a 256`.
const STUDENT_HASH = 'f5e4c205b9969dd4960747cdfa439b58880b29e54028e957a17e0044e4f89fd2';

type Row = { user_id: string; provider: string; external_id: string; email_hash: string | null };

function fakeAdmin(rows: Row[], opts: { failSelect?: boolean } = {}) {
  const writes: Array<{ op: string; payload: unknown }> = [];
  const admin = {
    from: vi.fn(() => {
      const filters: Array<[string, unknown]> = [];
      let inFilter: [string, unknown[]] | null = null;
      const pick = () =>
        rows.filter(
          (r) =>
            filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v) &&
            (!inFilter || inFilter[1].includes((r as Record<string, unknown>)[inFilter[0]])),
        );
      const q: Record<string, unknown> = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn((k: string, v: unknown) => {
        filters.push([k, v]);
        return q;
      });
      q.in = vi.fn((k: string, v: unknown[]) => {
        inFilter = [k, v];
        return q;
      });
      q.maybeSingle = vi.fn(async () =>
        opts.failSelect ? { data: null, error: { message: 'boom' } } : { data: pick()[0] ?? null, error: null },
      );
      q.then = (resolve: (v: unknown) => void) =>
        resolve(opts.failSelect ? { data: null, error: { message: 'boom' } } : { data: pick(), error: null });
      q.insert = vi.fn(async (payload: Row) => {
        writes.push({ op: 'insert', payload });
        rows.push(payload);
        return { error: null };
      });
      q.update = vi.fn((payload: unknown) => {
        writes.push({ op: 'update', payload });
        return { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
      });
      return q;
    }),
  };
  return { admin: admin as never, writes };
}

afterEach(() => vi.unstubAllEnvs());

describe('hashEmail', () => {
  it('hashes the trimmed, lowercased address with sha256 hex', () => {
    expect(hashEmail('  Student@School.ORG ')).toBe(STUDENT_HASH);
  });
  it('returns null for an empty or missing address', () => {
    expect(hashEmail('')).toBeNull();
    expect(hashEmail('   ')).toBeNull();
    expect(hashEmail(null)).toBeNull();
    expect(hashEmail(undefined)).toBeNull();
  });
});

describe('providerFromSupabase', () => {
  it('maps the Supabase provider names onto the stored ones', () => {
    expect(providerFromSupabase('google')).toBe('google');
    expect(providerFromSupabase('azure')).toBe('microsoft');
  });
  it('ignores providers that are not school identities', () => {
    expect(providerFromSupabase('discord')).toBeNull();
    expect(providerFromSupabase('apple')).toBeNull();
    expect(providerFromSupabase('email')).toBeNull();
    expect(providerFromSupabase(undefined)).toBeNull();
  });
});

describe('isIdentityLinkingEnabled', () => {
  it('is off unless the flag is exactly "true"', () => {
    expect(isIdentityLinkingEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', '1');
    expect(isIdentityLinkingEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    expect(isIdentityLinkingEnabled()).toBe(true);
  });
});

describe('linkExternalIdentity', () => {
  it('inserts a new link with the email hash, never the raw email', async () => {
    const { admin, writes } = fakeAdmin([]);
    const res = await linkExternalIdentity(admin, {
      userId: 'u1',
      provider: 'google',
      externalId: '1099',
      email: 'Student@School.org',
    });
    expect(res).toEqual({ ok: true, status: 'linked' });
    expect(writes).toHaveLength(1);
    expect(writes[0].payload).toEqual({ user_id: 'u1', provider: 'google', external_id: '1099', email_hash: STUDENT_HASH });
    expect(JSON.stringify(writes)).not.toMatch(/school\.org/i);
  });

  it('is a no-op when the same user already holds the link', async () => {
    const { admin, writes } = fakeAdmin([{ user_id: 'u1', provider: 'google', external_id: '1099', email_hash: STUDENT_HASH }]);
    const res = await linkExternalIdentity(admin, { userId: 'u1', provider: 'google', externalId: '1099', email: 'student@school.org' });
    expect(res).toEqual({ ok: true, status: 'unchanged' });
    expect(writes).toHaveLength(0);
  });

  it('never reassigns an identity another user already holds', async () => {
    const { admin, writes } = fakeAdmin([{ user_id: 'other', provider: 'google', external_id: '1099', email_hash: null }]);
    const res = await linkExternalIdentity(admin, { userId: 'u1', provider: 'google', externalId: '1099', email: null });
    expect(res).toEqual({ ok: false, reason: 'conflict' });
    expect(writes).toHaveLength(0);
  });

  it('rejects unknown providers and empty ids without touching the table', async () => {
    const { admin, writes } = fakeAdmin([]);
    expect(await linkExternalIdentity(admin, { userId: 'u1', provider: 'discord' as never, externalId: 'x' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await linkExternalIdentity(admin, { userId: 'u1', provider: 'google', externalId: '' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(writes).toHaveLength(0);
  });

  it('reports a read failure instead of guessing', async () => {
    const { admin } = fakeAdmin([], { failSelect: true });
    expect(await linkExternalIdentity(admin, { userId: 'u1', provider: 'google', externalId: '1' })).toEqual({
      ok: false,
      reason: 'db_error',
    });
  });
});

describe('lookups', () => {
  const rows: Row[] = [
    { user_id: 'u1', provider: 'google', external_id: '1099', email_hash: STUDENT_HASH },
    { user_id: 'u2', provider: 'microsoft', external_id: '1099', email_hash: null },
  ];

  it('finds the user for a provider + external id, scoped by provider', async () => {
    expect(await findUserByExternalIdentity(fakeAdmin([...rows]).admin, 'google', '1099')).toBe('u1');
    expect(await findUserByExternalIdentity(fakeAdmin([...rows]).admin, 'microsoft', '1099')).toBe('u2');
    expect(await findUserByExternalIdentity(fakeAdmin([...rows]).admin, 'google', 'nope')).toBeNull();
  });

  it('lists the links of a set of users for one provider', async () => {
    const out = await listLinkedIdentities(fakeAdmin([...rows]).admin, 'google', ['u1', 'u2']);
    expect(out).toEqual([{ userId: 'u1', externalId: '1099', emailHash: STUDENT_HASH }]);
  });

  it('returns an empty list for no users without querying', async () => {
    const { admin } = fakeAdmin([...rows]);
    expect(await listLinkedIdentities(admin, 'google', [])).toEqual([]);
    expect((admin as unknown as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });
});
