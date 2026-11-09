import { describe, it, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(), cookieAccessToken: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/backend/utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));
vi.mock('@/backend/utils/educationRoundTelemetry', () => ({ isQaEmail: () => false }));
vi.mock('@/lib/education/eduTestAccount', () => ({ isAnyTestAccount: async () => false }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn() } }));

import { autoJoinSignedInStudent, isAnonymousAccessToken, type RunSignedInJoinDeps } from '../runSignedInJoin';

function deps(user: { id: string; isAnonymous?: boolean }): RunSignedInJoinDeps & { join: ReturnType<typeof vi.fn> } {
  return {
    hasSession: async () => true,
    currentUser: async () => user,
    join: vi.fn(async () => ({ ok: true as const, classroomId: 'c1', alreadyMember: false, gameCode: null })),
    capture: vi.fn(),
    isTestAccount: () => false,
  };
}

const jwt = (claims: Record<string, unknown>) =>
  `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

describe('autoJoinSignedInStudent on a shared device', () => {
  it('Given the previous student\'s anonymous session, When an invite link opens, Then nobody is enrolled and the form renders', async () => {
    const d = deps({ id: 'guest-1', isAnonymous: true });
    await expect(autoJoinSignedInStudent('en', 'ABC123', d)).resolves.toBeNull();
    expect(d.join).not.toHaveBeenCalled();
  });

  it('Given a real signed-in account, When an invite link opens, Then it still auto-joins', async () => {
    const d = deps({ id: 'student-1', isAnonymous: false });
    await expect(autoJoinSignedInStudent('en', 'ABC123', d)).resolves.toBe('/en/student?class=open');
    expect(d.join).toHaveBeenCalledWith('ABC123');
  });
});

describe('isAnonymousAccessToken', () => {
  it('reads the is_anonymous claim', () => {
    expect(isAnonymousAccessToken(jwt({ sub: 'u', is_anonymous: true }))).toBe(true);
    expect(isAnonymousAccessToken(jwt({ sub: 'u', is_anonymous: false }))).toBe(false);
    expect(isAnonymousAccessToken(jwt({ sub: 'u' }))).toBe(false);
  });

  it('treats an unreadable token as not anonymous', () => {
    expect(isAnonymousAccessToken('garbage')).toBe(false);
    expect(isAnonymousAccessToken(null)).toBe(false);
  });
});
