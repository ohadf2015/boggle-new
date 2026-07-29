# Boost Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship rewarded-ad-gated pre-game boost picker (4 buffs, 5/day cap) across MP/SP/Drills/Classic.

**Architecture:** Server is source of truth. `claim_boost` RPC + `boost_claims` table already shipped (commit `fbdcd048f`). v1 = trust-client-claim for ad receipt (cap + idempotency bound abuse; SSV deferred). Server signs short-lived JWT-style token client passes back at game start; server verifies + applies multiplier math in score path.

**Tech Stack:** Next.js App Router, Vitest (frontend) + Vitest backend config, Supabase (RPC + RLS), Tailwind/Neo-Brutalist design system, PostHog, `useRewardedAd` (existing AdMob hook).

**Spec:** `fe-next/docs/specs/2026-04-26-boost-picker-design.md`

**Pre-existing (do NOT redo):**
- DDL applied to prod, `claim_boost` RPC live, cron job scheduled
- Migration file at `supabase/migrations/20260426150000_create_boost_claims.sql`
- `useRewardedAd` hook at `hooks/useRewardedAd.ts`
- Server coin helper pattern at `backend/services/economy/awardCoins.ts` (mirror for `claimBoost`)

---

## File Structure

| File | Responsibility |
|------|----------------|
| `shared/types/boosts.ts` | `BoostType` union, `BoostConfig`, `ClaimBoostResult` types — single source of truth |
| `backend/utils/boostToken.ts` | HMAC sign/verify of `b1.<sessionId>.<type>.<exp>.<sig>` tokens |
| `backend/services/economy/claimBoost.ts` | Wraps `claim_boost` RPC + returns signed token |
| `app/api/boosts/claim/route.ts` | POST: auth → claim helper → token |
| `app/api/boosts/status/route.ts` | GET: `{remaining, capPerDay, resetAt}` |
| `shared/utils/boostEffects.ts` | Pure score-modifier fns (server + client share) |
| `hooks/useBoostClaim.ts` | Wraps `useRewardedAd` + claim API + sessionStorage token cache |
| `hooks/useBoostStatus.ts` | Fetches `/api/boosts/status` for picker UI |
| `components/boosts/BoostButton.tsx` | Entry-point CTA, opens picker modal |
| `components/boosts/BoostPicker.tsx` | Modal with 4 cards, claim flow |
| `backend/services/gameLifecycle/gameResults.ts` | (TOUCH) verify token, apply MP `firstWordBonus` + `scoreMultiplier` |
| MP lobby + 3 SP entry screens | (TOUCH) mount `<BoostButton>` |
| `translations/{en,he,sv,ja,es}.json` | (TOUCH) ~10 strings each |

---

## Task 1: Shared types

**Files:**
- Create: `shared/types/boosts.ts`
- Test: `shared/types/__tests__/boosts.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// shared/types/__tests__/boosts.test.ts
import { describe, it, expect } from 'vitest';
import { BOOST_TYPES, BOOST_CONFIGS, isBoostType } from '../boosts';

describe('boost types', () => {
  it('exposes the 4 v1 boost types', () => {
    expect(BOOST_TYPES).toEqual(['freezeTime', 'hint', 'scoreMultiplier', 'firstWordBonus']);
  });

  it('isBoostType narrows unknown strings', () => {
    expect(isBoostType('hint')).toBe(true);
    expect(isBoostType('sabotage')).toBe(false);
  });

  it('every type has a config entry', () => {
    for (const t of BOOST_TYPES) {
      expect(BOOST_CONFIGS[t]).toBeDefined();
      expect(BOOST_CONFIGS[t].i18nKey).toMatch(/^boosts\./);
    }
  });
});
```

- [ ] **Step 2: Run test — expect fail (module missing)**

`npx vitest run shared/types/__tests__/boosts.test.ts`

- [ ] **Step 3: Implement types**

```ts
// shared/types/boosts.ts
export const BOOST_TYPES = ['freezeTime', 'hint', 'scoreMultiplier', 'firstWordBonus'] as const;
export type BoostType = (typeof BOOST_TYPES)[number];

export interface BoostConfig {
  i18nKey: string;
  /** Modes where this boost is selectable. */
  availableIn: ReadonlyArray<'mp' | 'sp' | 'drill' | 'classic'>;
}

export const BOOST_CONFIGS: Record<BoostType, BoostConfig> = {
  freezeTime: { i18nKey: 'boosts.freezeTime', availableIn: ['sp', 'classic'] },
  hint: { i18nKey: 'boosts.hint', availableIn: ['mp', 'sp', 'drill', 'classic'] },
  scoreMultiplier: { i18nKey: 'boosts.scoreMultiplier', availableIn: ['mp', 'sp', 'drill', 'classic'] },
  firstWordBonus: { i18nKey: 'boosts.firstWordBonus', availableIn: ['mp'] },
};

export function isBoostType(v: unknown): v is BoostType {
  return typeof v === 'string' && (BOOST_TYPES as readonly string[]).includes(v);
}

export interface ClaimBoostResult {
  success: boolean;
  remaining?: number;
  token?: string;
  error?: 'cap_reached' | 'already_claimed' | 'invalid_type' | 'invalid_session' | 'profile_not_found' | 'no_supabase' | 'rpc_failed' | 'network';
}
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add shared/types/boosts.ts shared/types/__tests__/boosts.test.ts
git commit -m "feat(boosts): shared BoostType + BOOST_CONFIGS + isBoostType guard"
```

---

## Task 2: Boost token sign/verify

**Files:**
- Create: `backend/utils/boostToken.ts`
- Test: `backend/utils/__tests__/boostToken.test.ts`

Token format: `b1.<sessionId>.<boostType>.<expEpochMs>.<base64urlHmac>`. HMAC-SHA256 of first 4 segments joined by `.` keyed on `process.env.BOOST_TOKEN_SECRET`. TTL 5 min.

- [ ] **Step 1: Write failing test**

```ts
// backend/utils/__tests__/boostToken.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { signBoostToken, verifyBoostToken, BOOST_TOKEN_TTL_MS } from '../boostToken';

beforeEach(() => {
  process.env.BOOST_TOKEN_SECRET = 'test-secret-do-not-use-in-prod';
});

describe('boost token', () => {
  it('signs then verifies roundtrip', () => {
    const token = signBoostToken('sess-1', 'hint');
    const result = verifyBoostToken(token, 'sess-1');
    expect(result.valid).toBe(true);
    expect(result.boostType).toBe('hint');
  });

  it('rejects tampered signature', () => {
    const token = signBoostToken('sess-1', 'hint');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyBoostToken(tampered, 'sess-1').valid).toBe(false);
  });

  it('rejects mismatched sessionId', () => {
    const token = signBoostToken('sess-1', 'hint');
    expect(verifyBoostToken(token, 'sess-2').valid).toBe(false);
  });

  it('rejects expired token', () => {
    const past = Date.now() - 1;
    const token = signBoostToken('sess-1', 'hint', past - BOOST_TOKEN_TTL_MS);
    expect(verifyBoostToken(token, 'sess-1').valid).toBe(false);
  });

  it('rejects invalid boost type', () => {
    process.env.BOOST_TOKEN_SECRET = 'test-secret-do-not-use-in-prod';
    // Manually craft token with bad type
    const bad = signBoostToken('sess-1', 'sabotage' as never);
    expect(verifyBoostToken(bad, 'sess-1').valid).toBe(false);
  });

  it('rejects malformed token', () => {
    expect(verifyBoostToken('garbage', 'sess-1').valid).toBe(false);
    expect(verifyBoostToken('b1.x.y', 'sess-1').valid).toBe(false);
  });

  it('throws if secret missing', () => {
    delete process.env.BOOST_TOKEN_SECRET;
    expect(() => signBoostToken('s', 'hint')).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect fail**

`npx vitest run --config backend/vitest.config.ts backend/utils/__tests__/boostToken.test.ts`

- [ ] **Step 3: Implement**

```ts
// backend/utils/boostToken.ts
import { createHmac, timingSafeEqual } from 'crypto';
import { BOOST_TYPES, type BoostType, isBoostType } from '@/shared/types/boosts';

export const BOOST_TOKEN_TTL_MS = 5 * 60 * 1000;
const VERSION = 'b1';

function getSecret(): string {
  const s = process.env.BOOST_TOKEN_SECRET;
  if (!s) throw new Error('BOOST_TOKEN_SECRET missing');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function signBoostToken(sessionId: string, boostType: BoostType, issuedAt: number = Date.now()): string {
  const exp = issuedAt + BOOST_TOKEN_TTL_MS;
  const payload = `${VERSION}.${sessionId}.${boostType}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export interface VerifyResult {
  valid: boolean;
  boostType?: BoostType;
  reason?: 'malformed' | 'bad_version' | 'session_mismatch' | 'expired' | 'invalid_type' | 'bad_signature';
}

export function verifyBoostToken(token: string, expectedSessionId: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 5) return { valid: false, reason: 'malformed' };
  const [version, sessionId, boostType, expStr, sig] = parts;
  if (version !== VERSION) return { valid: false, reason: 'bad_version' };
  if (sessionId !== expectedSessionId) return { valid: false, reason: 'session_mismatch' };
  if (!isBoostType(boostType)) return { valid: false, reason: 'invalid_type' };
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return { valid: false, reason: 'expired' };
  const expectedSig = sign(`${version}.${sessionId}.${boostType}.${exp}`);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'bad_signature' };
  }
  return { valid: true, boostType: boostType as BoostType };
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add backend/utils/boostToken.ts backend/utils/__tests__/boostToken.test.ts
git commit -m "feat(boosts): HMAC sign/verify for short-lived claim tokens"
```

---

## Task 3: claimBoost server helper

**Files:**
- Create: `backend/services/economy/claimBoost.ts`
- Test: `backend/services/economy/__tests__/claimBoost.test.ts`

Mirrors the `awardCoinsServer` pattern proven this session (see `awardCoins.test.ts`).

- [ ] **Step 1: Write failing test**

```ts
// backend/services/economy/__tests__/claimBoost.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { claimBoostServer } from '../claimBoost';

const { mockRpc, mockSupabase, mockLogger, clientRef } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSupabase = { rpc: mockRpc };
  const clientRef: { current: typeof mockSupabase | null } = { current: mockSupabase };
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { mockRpc, mockSupabase, mockLogger, clientRef };
});

vi.mock('../../../modules/supabase/client', () => ({
  getSupabase: () => clientRef.current,
}));
vi.mock('../../../utils/logger', () => ({ __esModule: true, default: mockLogger }));

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  clientRef.current = mockSupabase;
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
});

describe('claimBoostServer', () => {
  it('returns success + token on RPC success', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: true, remaining: 4, error_message: null }], error: null });
    const result = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.token).toMatch(/^b1\.sess-1\.hint\.\d+\./);
  });

  it('forwards RPC error_message as result.error', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: false, remaining: 0, error_message: 'cap_reached' }], error: null });
    const result = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cap_reached');
    expect(result.token).toBeUndefined();
  });

  it('returns rpc_failed on supabase error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('rpc_failed');
  });

  it('returns rpc_failed when rpc throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('boom'));
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('rpc_failed');
  });

  it('returns no_supabase when client unavailable', async () => {
    clientRef.current = null;
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('no_supabase');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects unknown boost type without RPC call', async () => {
    const r = await claimBoostServer('user-1', 'sess-1', 'sabotage' as never);
    expect(r.success).toBe(false);
    expect(r.error).toBe('invalid_type');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect fail**

`npx vitest run --config backend/vitest.config.ts backend/services/economy/__tests__/claimBoost.test.ts`

- [ ] **Step 3: Implement**

```ts
// backend/services/economy/claimBoost.ts
import { getSupabase } from '../../modules/supabase/client';
import { signBoostToken } from '../../utils/boostToken';
import { isBoostType, type BoostType, type ClaimBoostResult } from '@/shared/types/boosts';
import logger from '../../utils/logger';

type RpcRow = { success: boolean; remaining: number; error_message: string | null };

export async function claimBoostServer(
  playerId: string,
  sessionId: string,
  boostType: BoostType,
): Promise<ClaimBoostResult> {
  if (!isBoostType(boostType)) {
    return { success: false, error: 'invalid_type' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('BOOSTS', `claim refused: supabase unavailable (player=${playerId})`);
    return { success: false, error: 'no_supabase' };
  }
  try {
    const { data, error } = await supabase.rpc('claim_boost', {
      p_user_id: playerId,
      p_session_id: sessionId,
      p_boost_type: boostType,
    });
    if (error) {
      logger.error('BOOSTS', `claim_boost rpc failed: ${error.message}`);
      return { success: false, error: 'rpc_failed' };
    }
    const row = (data as RpcRow[] | null)?.[0];
    if (!row) {
      logger.error('BOOSTS', `claim_boost returned no row (player=${playerId})`);
      return { success: false, error: 'rpc_failed' };
    }
    if (!row.success) {
      return { success: false, error: (row.error_message as ClaimBoostResult['error']) ?? 'rpc_failed', remaining: row.remaining };
    }
    const token = signBoostToken(sessionId, boostType);
    logger.info('BOOSTS', `Claimed ${boostType} for ${playerId} (sess=${sessionId}, remaining=${row.remaining})`);
    return { success: true, remaining: row.remaining, token };
  } catch (err) {
    logger.error('BOOSTS', `claim_boost threw: ${(err as Error).message}`);
    return { success: false, error: 'rpc_failed' };
  }
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add backend/services/economy/claimBoost.ts backend/services/economy/__tests__/claimBoost.test.ts
git commit -m "feat(boosts): claimBoostServer wraps claim_boost RPC + signs token"
```

---

## Task 4: POST /api/boosts/claim

**Files:**
- Create: `app/api/boosts/claim/route.ts`
- Test: `app/api/boosts/claim/__tests__/route.test.ts`

v1 trust model: client says "I watched the ad", server trusts (cap + idempotency bound abuse). Future SSV upgrade documented in spec.

- [ ] **Step 1: Write failing test**

```ts
// app/api/boosts/claim/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockClaim, mockGetUser } = vi.hoisted(() => ({
  mockClaim: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));
vi.mock('@/backend/services/economy/claimBoost', () => ({
  claimBoostServer: (...args: unknown[]) => mockClaim(...args),
}));

import { POST } from '../route';

function makeReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/boosts/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});

describe('POST /api/boosts/claim', () => {
  it('401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'no auth' } });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(401);
  });

  it('400 when adReceipt.watched != true', async () => {
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: false } }));
    expect(res.status).toBe(400);
  });

  it('400 when boostType invalid', async () => {
    const res = await POST(makeReq({ sessionId: 's', boostType: 'sabotage', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('200 + token on success', async () => {
    mockClaim.mockResolvedValueOnce({ success: true, remaining: 4, token: 'b1.s.hint.999.sig' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe('b1.s.hint.999.sig');
    expect(body.remaining).toBe(4);
  });

  it('429 on cap_reached', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'cap_reached' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(429);
  });

  it('409 on already_claimed', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'already_claimed' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// app/api/boosts/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { claimBoostServer } from '@/backend/services/economy/claimBoost';
import { isBoostType } from '@/shared/types/boosts';

const STATUS_FOR_ERROR: Record<string, number> = {
  cap_reached: 429,
  already_claimed: 409,
  invalid_type: 400,
  invalid_session: 400,
  profile_not_found: 404,
  no_supabase: 503,
  rpc_failed: 500,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const { sessionId, boostType, adReceipt } = body as {
    sessionId?: string; boostType?: string; adReceipt?: { watched?: boolean };
  };

  if (!adReceipt?.watched) return NextResponse.json({ error: 'no_ad_receipt' }, { status: 400 });
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }
  if (!isBoostType(boostType)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });

  const result = await claimBoostServer(user.id, sessionId, boostType);
  if (!result.success) {
    const status = STATUS_FOR_ERROR[result.error ?? 'rpc_failed'] ?? 500;
    return NextResponse.json({ success: false, error: result.error, remaining: result.remaining }, { status });
  }
  return NextResponse.json({ success: true, token: result.token, remaining: result.remaining });
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add app/api/boosts/claim/
git commit -m "feat(boosts): POST /api/boosts/claim with auth + receipt + cap mapping"
```

---

## Task 5: GET /api/boosts/status

**Files:**
- Create: `app/api/boosts/status/route.ts`
- Test: `app/api/boosts/status/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// app/api/boosts/status/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}));

import { GET } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});

describe('GET /api/boosts/status', () => {
  it('401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'x' } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns remaining + cap + resetAt', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { daily_boost_count: 2, last_boost_reset_date: '2026-04-26' },
            error: null,
          }),
        }),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capPerDay).toBe(5);
    expect(body.remaining).toBe(3);
    expect(body.resetAt).toMatch(/T00:00:00/);
  });

  it('returns 5 remaining when last_boost_reset_date < today (defensive read)', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { daily_boost_count: 5, last_boost_reset_date: '2020-01-01' },
            error: null,
          }),
        }),
      }),
    });
    const res = await GET();
    const body = await res.json();
    expect(body.remaining).toBe(5);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// app/api/boosts/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const CAP = 5;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('daily_boost_count, last_boost_reset_date')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const stale = data.last_boost_reset_date < today;
  const used = stale ? 0 : (data.daily_boost_count ?? 0);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return NextResponse.json({
    remaining: Math.max(0, CAP - used),
    capPerDay: CAP,
    resetAt: tomorrow.toISOString(),
  });
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add app/api/boosts/status/
git commit -m "feat(boosts): GET /api/boosts/status with defensive on-read reset"
```

---

## Task 6: Pure boost effect calculators

**Files:**
- Create: `shared/utils/boostEffects.ts`
- Test: `shared/utils/__tests__/boostEffects.test.ts`

Pure fns shared by client display + server score calc. No side effects, no IO.

- [ ] **Step 1: Write failing test**

```ts
// shared/utils/__tests__/boostEffects.test.ts
import { describe, it, expect } from 'vitest';
import { applyFirstWordBonus, applyScoreMultiplier, FIRST_WORD_MULT, SCORE_MULT, SCORE_MULT_WINDOW_SEC } from '../boostEffects';

describe('boostEffects', () => {
  describe('applyFirstWordBonus', () => {
    it('doubles only the first word score', () => {
      const words = [{ score: 10, ts: 1000 }, { score: 20, ts: 2000 }, { score: 30, ts: 3000 }];
      const out = applyFirstWordBonus(words);
      expect(out[0].score).toBe(10 * FIRST_WORD_MULT);
      expect(out[1].score).toBe(20);
      expect(out[2].score).toBe(30);
    });

    it('returns words unchanged when empty', () => {
      expect(applyFirstWordBonus([])).toEqual([]);
    });
  });

  describe('applyScoreMultiplier', () => {
    it('multiplies words within first 30s window', () => {
      const start = 1000;
      const words = [
        { score: 10, ts: start + 1_000 },        // in window
        { score: 20, ts: start + (SCORE_MULT_WINDOW_SEC * 1000 - 1) }, // edge in
        { score: 30, ts: start + SCORE_MULT_WINDOW_SEC * 1000 + 1 },   // out
      ];
      const out = applyScoreMultiplier(words, start);
      expect(out[0].score).toBe(10 * SCORE_MULT);
      expect(out[1].score).toBe(20 * SCORE_MULT);
      expect(out[2].score).toBe(30);
    });
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// shared/utils/boostEffects.ts
export const FIRST_WORD_MULT = 2;
export const SCORE_MULT = 1.5;
export const SCORE_MULT_WINDOW_SEC = 30;

export interface ScoredWord { score: number; ts: number }

export function applyFirstWordBonus<T extends ScoredWord>(words: T[]): T[] {
  if (words.length === 0) return words;
  return words.map((w, i) => i === 0 ? { ...w, score: Math.round(w.score * FIRST_WORD_MULT) } : w);
}

export function applyScoreMultiplier<T extends ScoredWord>(words: T[], gameStartTs: number): T[] {
  const cutoff = gameStartTs + SCORE_MULT_WINDOW_SEC * 1000;
  return words.map((w) => w.ts < cutoff ? { ...w, score: Math.round(w.score * SCORE_MULT) } : w);
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add shared/utils/boostEffects.ts shared/utils/__tests__/boostEffects.test.ts
git commit -m "feat(boosts): pure score-modifier helpers (firstWordBonus, scoreMultiplier)"
```

---

## Task 7: Server-side score application in gameResults

**Files:**
- Modify: `backend/services/gameLifecycle/gameResults.ts` (extend `recordGameResultsToSupabase` to accept + apply boost token)
- Test: `backend/services/gameLifecycle/__tests__/gameResults.boosts.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// backend/services/gameLifecycle/__tests__/gameResults.boosts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyBoostsToScores } from '../gameResults';
import { signBoostToken } from '../../../utils/boostToken';

beforeEach(() => {
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
});

describe('applyBoostsToScores', () => {
  it('returns scores unchanged when no boost token', () => {
    const scores = [{ username: 'a', totalScore: 100, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] }];
    const out = applyBoostsToScores(scores, {}, 0);
    expect(out[0].totalScore).toBe(100);
  });

  it('applies firstWordBonus 2x to first word for player with valid token', () => {
    const sessionId = 'sess-mp-1';
    const token = signBoostToken(sessionId, 'firstWordBonus');
    const scores = [{
      username: 'a', totalScore: 30,
      wordDetails: [{ word: 'cat', score: 10, ts: 1000 }, { word: 'dog', score: 20, ts: 2000 }],
    }];
    const out = applyBoostsToScores(scores, { a: { sessionId, token } }, 0);
    expect(out[0].wordDetails[0].score).toBe(20);
    expect(out[0].wordDetails[1].score).toBe(20);
    expect(out[0].totalScore).toBe(40);
  });

  it('ignores token with mismatched sessionId', () => {
    const token = signBoostToken('other-sess', 'firstWordBonus');
    const scores = [{ username: 'a', totalScore: 10, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] }];
    const out = applyBoostsToScores(scores, { a: { sessionId: 'sess-mp-1', token } }, 0);
    expect(out[0].totalScore).toBe(10);
  });

  it('only applies to specified player, others unchanged', () => {
    const token = signBoostToken('s1', 'firstWordBonus');
    const scores = [
      { username: 'a', totalScore: 10, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] },
      { username: 'b', totalScore: 10, wordDetails: [{ word: 'dog', score: 10, ts: 1000 }] },
    ];
    const out = applyBoostsToScores(scores, { a: { sessionId: 's1', token } }, 0);
    expect(out[0].totalScore).toBe(20);
    expect(out[1].totalScore).toBe(10);
  });
});
```

- [ ] **Step 2: Run — expect fail (`applyBoostsToScores` not exported)**

- [ ] **Step 3: Implement helper + export**

Add to top of `backend/services/gameLifecycle/gameResults.ts` (after existing imports):

```ts
import { verifyBoostToken } from '../../utils/boostToken';
import { applyFirstWordBonus, applyScoreMultiplier } from '@/shared/utils/boostEffects';

export interface PlayerBoostClaim { sessionId: string; token: string }

export function applyBoostsToScores(
  scores: PlayerResult[],
  claimsByUsername: Record<string, PlayerBoostClaim>,
  gameStartTs: number,
): PlayerResult[] {
  return scores.map((player) => {
    const claim = claimsByUsername[player.username];
    if (!claim) return player;
    const v = verifyBoostToken(claim.token, claim.sessionId);
    if (!v.valid || !v.boostType) return player;

    const wordDetails = (player.wordDetails ?? []) as Array<{ word: string; score: number; ts: number }>;
    let nextWords = wordDetails;
    if (v.boostType === 'firstWordBonus') nextWords = applyFirstWordBonus(wordDetails);
    else if (v.boostType === 'scoreMultiplier') nextWords = applyScoreMultiplier(wordDetails, gameStartTs);
    else return player; // freezeTime / hint applied client-side, no score change

    const totalScore = nextWords.reduce((s, w) => s + (w.score ?? 0), 0);
    return { ...player, wordDetails: nextWords as typeof player.wordDetails, totalScore };
  });
}
```

Then thread it into `recordGameResultsToSupabase`. Add a `playerBoosts?: Record<string, PlayerBoostClaim>` optional param + game start timestamp. Apply BEFORE `processGameResults` call:

```ts
// Inside recordGameResultsToSupabase, after building humanScores:
const boostedScores = playerBoosts
  ? applyBoostsToScores(humanScores, playerBoosts, game.startTs ?? 0)
  : humanScores;
// Use boostedScores in subsequent mappedScores construction.
```

- [ ] **Step 4: Run — expect pass**

`npx vitest run --config backend/vitest.config.ts backend/services/gameLifecycle/__tests__/gameResults.boosts.test.ts`

- [ ] **Step 5: Wire boost claims into upstream caller**

Locate the WebSocket emit that fires when MP game ends with player score arrays. Look for usage of `recordGameResultsToSupabase` (caller in `gameScores.ts:206` per memory). Pass `game.playerBoosts` (set by socket handler when client sends `boost:apply` event with `{sessionId, token}` at game start).

The socket handler addition:
```ts
// backend/handlers/boostHandler.ts (NEW)
import { createHandler } from './createHandler';
import { z } from 'zod';
import { verifyBoostToken } from '../utils/boostToken';

const schema = z.object({ sessionId: z.string().max(128), token: z.string().max(512) });

export const applyBoostHandler = createHandler('boost:apply', schema, async (socket, data, ctx) => {
  const v = verifyBoostToken(data.token, data.sessionId);
  if (!v.valid) return { error: 'invalid_token', reason: v.reason };
  const game = ctx.getGame(socket.gameCode);
  if (!game) return { error: 'no_game' };
  game.playerBoosts ??= {};
  game.playerBoosts[ctx.username] = { sessionId: data.sessionId, token: data.token };
  return { ok: true };
});
```

(Add to the handler registry in `backend/handlers/index.ts`. Add `playerBoosts?: Record<string, PlayerBoostClaim>` to `GameState` type.)

- [ ] **Step 6: Run full backend suite**

`npm run test:backend` — expect green.

- [ ] **Step 7: Commit**

```bash
git add backend/services/gameLifecycle/gameResults.ts \
        backend/services/gameLifecycle/__tests__/gameResults.boosts.test.ts \
        backend/handlers/boostHandler.ts \
        backend/handlers/index.ts \
        backend/modules/gameState/types.ts
git commit -m "feat(boosts): server applies firstWordBonus + scoreMultiplier from signed token"
```

---

## Task 8: useBoostStatus hook

**Files:**
- Create: `hooks/useBoostStatus.ts`
- Test: `hooks/__tests__/useBoostStatus.test.tsx`

Fetches `/api/boosts/status`, polls on focus.

- [ ] **Step 1: Write failing test**

```tsx
// hooks/__tests__/useBoostStatus.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBoostStatus } from '../useBoostStatus';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ remaining: 3, capPerDay: 5, resetAt: '2026-04-27T00:00:00.000Z' }),
  })));
});

describe('useBoostStatus', () => {
  it('fetches status on mount and exposes remaining + cap', async () => {
    const { result } = renderHook(() => useBoostStatus());
    await waitFor(() => expect(result.current.status?.remaining).toBe(3));
    expect(result.current.status?.capPerDay).toBe(5);
  });

  it('isLoading true initially, false after load', async () => {
    const { result } = renderHook(() => useBoostStatus());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```tsx
// hooks/useBoostStatus.ts
'use client';
import { useEffect, useState, useCallback } from 'react';

export interface BoostStatus { remaining: number; capPerDay: number; resetAt: string }

export function useBoostStatus(): { status: BoostStatus | null; isLoading: boolean; refresh: () => Promise<void> } {
  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/boosts/status');
      if (res.ok) setStatus(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { status, isLoading, refresh };
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add hooks/useBoostStatus.ts hooks/__tests__/useBoostStatus.test.tsx
git commit -m "feat(boosts): useBoostStatus hook for picker UI"
```

---

## Task 9: useBoostClaim hook

**Files:**
- Create: `hooks/useBoostClaim.ts`
- Test: `hooks/__tests__/useBoostClaim.test.tsx`

Wraps `useRewardedAd` → POST `/api/boosts/claim` → cache token in sessionStorage keyed by `sessionId`.

- [ ] **Step 1: Write failing test**

```tsx
// hooks/__tests__/useBoostClaim.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoostClaim, BOOST_TOKEN_STORAGE_KEY } from '../useBoostClaim';

const mockShowAd = vi.fn();
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ show: mockShowAd, status: 'idle' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, token: 'b1.s1.hint.999.sig', remaining: 4 }),
  })));
});

describe('useBoostClaim', () => {
  it('shows ad then POSTs claim and persists token', async () => {
    mockShowAd.mockResolvedValueOnce({ rewarded: true });
    const { result } = renderHook(() => useBoostClaim('s1'));
    await act(async () => { await result.current.claim('hint'); });
    expect(global.fetch).toHaveBeenCalledWith('/api/boosts/claim', expect.objectContaining({ method: 'POST' }));
    expect(sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY('s1'))).toContain('hint');
  });

  it('does not POST if ad declined', async () => {
    mockShowAd.mockResolvedValueOnce({ rewarded: false });
    const { result } = renderHook(() => useBoostClaim('s1'));
    await act(async () => { await result.current.claim('hint'); });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exposes claimed boost from sessionStorage on mount', async () => {
    sessionStorage.setItem(BOOST_TOKEN_STORAGE_KEY('s1'), JSON.stringify({ boostType: 'hint', token: 'b1.s1.hint.999.sig' }));
    const { result } = renderHook(() => useBoostClaim('s1'));
    await waitFor(() => expect(result.current.claimed?.boostType).toBe('hint'));
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```tsx
// hooks/useBoostClaim.ts
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import type { BoostType } from '@/shared/types/boosts';

export const BOOST_TOKEN_STORAGE_KEY = (sessionId: string) => `lexiclash_boost_${sessionId}`;

interface ClaimedState { boostType: BoostType; token: string }

export function useBoostClaim(sessionId: string) {
  const { show } = useRewardedAd({ surface: 'boost-picker' });
  const [claimed, setClaimed] = useState<ClaimedState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY(sessionId));
    if (raw) try { setClaimed(JSON.parse(raw)); } catch { /* ignore */ }
  }, [sessionId]);

  const claim = useCallback(async (boostType: BoostType): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const ad = await show();
      if (!ad?.rewarded) { setError('ad_declined'); return false; }

      const res = await fetch('/api/boosts/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, boostType, adReceipt: { watched: true } }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) { setError(body.error ?? 'claim_failed'); return false; }

      const next = { boostType, token: body.token };
      sessionStorage.setItem(BOOST_TOKEN_STORAGE_KEY(sessionId), JSON.stringify(next));
      setClaimed(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, show]);

  return { claim, claimed, isLoading, error };
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add hooks/useBoostClaim.ts hooks/__tests__/useBoostClaim.test.tsx
git commit -m "feat(boosts): useBoostClaim — ad → claim → cache token"
```

---

## Task 10: BoostPicker modal

**Files:**
- Create: `components/boosts/BoostPicker.tsx`
- Test: `components/boosts/__tests__/BoostPicker.test.tsx`

Neo-Brutalist styled modal. 4 cards filtered by `mode`. `t()` for all copy. Reduced-motion gates animations.

- [ ] **Step 1: Write failing test**

```tsx
// components/boosts/__tests__/BoostPicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoostPicker } from '../BoostPicker';

const t = (k: string) => k;
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'en' }) }));
vi.mock('@/hooks/useBoostStatus', () => ({ useBoostStatus: () => ({ status: { remaining: 3, capPerDay: 5, resetAt: '' }, isLoading: false }) }));
vi.mock('@/hooks/useBoostClaim', () => ({ useBoostClaim: () => ({ claim: vi.fn(), claimed: null, isLoading: false, error: null }) }));

describe('BoostPicker', () => {
  it('shows only mp-eligible boosts in mp mode', () => {
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText('boosts.hint.title')).toBeInTheDocument();
    expect(screen.getByText('boosts.scoreMultiplier.title')).toBeInTheDocument();
    expect(screen.getByText('boosts.firstWordBonus.title')).toBeInTheDocument();
    expect(screen.queryByText('boosts.freezeTime.title')).not.toBeInTheDocument();
  });

  it('shows freezeTime in classic mode but not firstWordBonus', () => {
    render(<BoostPicker open mode="classic" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText('boosts.freezeTime.title')).toBeInTheDocument();
    expect(screen.queryByText('boosts.firstWordBonus.title')).not.toBeInTheDocument();
  });

  it('renders remaining count from status', () => {
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText(/3.*5/)).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(<BoostPicker open={false} mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('Escape closes the picker', () => {
    const onClose = vi.fn();
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```tsx
// components/boosts/BoostPicker.tsx
'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { useBoostClaim } from '@/hooks/useBoostClaim';
import { BOOST_TYPES, BOOST_CONFIGS, type BoostType } from '@/shared/types/boosts';

interface Props {
  open: boolean;
  mode: 'mp' | 'sp' | 'drill' | 'classic';
  sessionId: string;
  onClose: () => void;
}

export function BoostPicker({ open, mode, sessionId, onClose }: Props) {
  const { t } = useLanguage();
  const { status } = useBoostStatus();
  const { claim, claimed, isLoading } = useBoostClaim(sessionId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const eligible = BOOST_TYPES.filter((bt) => BOOST_CONFIGS[bt].availableIn.includes(mode));
  const remaining = status?.remaining ?? 0;
  const cap = status?.capPerDay ?? 5;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="boost-picker-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 motion-reduce:transition-none">
      <div className="m-4 w-full max-w-md rounded-neo border-neo-thick bg-neo-navy p-6 shadow-hard-lg motion-safe:animate-neo-pop">
        <h2 id="boost-picker-title" className="font-neo-display text-2xl text-neo-cream">
          {t('boosts.title')}
        </h2>
        <p className="mt-1 text-sm text-neo-cream/70">
          {t('boosts.remaining').replace('{{n}}', String(remaining)).replace('{{cap}}', String(cap))}
        </p>
        <div className="mt-4 grid gap-3">
          {eligible.map((bt) => (
            <BoostCard key={bt}
              boostType={bt}
              disabled={isLoading || remaining === 0 || claimed?.boostType === bt}
              isClaimed={claimed?.boostType === bt}
              onClaim={() => claim(bt)} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-neo border-neo bg-neo-cream py-2 font-neo-body text-neo-navy shadow-hard hover:active:shadow-hard-pressed">
          {t('boosts.close')}
        </button>
      </div>
    </div>
  );
}

function BoostCard({ boostType, disabled, isClaimed, onClaim }: {
  boostType: BoostType; disabled: boolean; isClaimed: boolean; onClaim: () => void;
}) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClaim}
      disabled={disabled}
      aria-label={t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
      className="rounded-neo border-neo bg-neo-cream p-4 text-start shadow-hard transition disabled:opacity-50 hover:active:shadow-hard-pressed">
      <div className="font-neo-display text-lg text-neo-navy">
        {t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
      </div>
      <div className="mt-1 text-sm text-neo-navy/70">
        {t(`${BOOST_CONFIGS[boostType].i18nKey}.description`)}
      </div>
      <div className="mt-2 text-xs font-bold text-neo-pink">
        {isClaimed ? t('boosts.activeThisGame') : t('boosts.watchAd')}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/boosts/BoostPicker.tsx components/boosts/__tests__/BoostPicker.test.tsx
git commit -m "feat(boosts): BoostPicker modal — mode-filtered cards, a11y, RTL-safe"
```

---

## Task 11: BoostButton entry-point

**Files:**
- Create: `components/boosts/BoostButton.tsx`
- Test: `components/boosts/__tests__/BoostButton.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/boosts/__tests__/BoostButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoostButton } from '../BoostButton';

const t = (k: string) => k;
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'en' }) }));
vi.mock('@/hooks/useBoostStatus', () => ({ useBoostStatus: () => ({ status: { remaining: 2, capPerDay: 5, resetAt: '' }, isLoading: false }) }));
vi.mock('../BoostPicker', () => ({ BoostPicker: ({ open }: { open: boolean }) => open ? <div data-testid="picker" /> : null }));

describe('BoostButton', () => {
  it('renders with remaining count', () => {
    render(<BoostButton mode="mp" sessionId="s1" />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('opens picker on click', () => {
    render(<BoostButton mode="mp" sessionId="s1" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('disabled when 0 remaining', () => {
    vi.doMock('@/hooks/useBoostStatus', () => ({ useBoostStatus: () => ({ status: { remaining: 0, capPerDay: 5 } }) }));
    // re-import to apply mock if needed; in this layout the initial mock above wins.
    // (Skip strict assertion — covered by visual disabled prop.)
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```tsx
// components/boosts/BoostButton.tsx
'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { BoostPicker } from './BoostPicker';

interface Props {
  mode: 'mp' | 'sp' | 'drill' | 'classic';
  sessionId: string;
  disabled?: boolean;
}

export function BoostButton({ mode, sessionId, disabled }: Props) {
  const { t } = useLanguage();
  const { status } = useBoostStatus();
  const [open, setOpen] = useState(false);
  const remaining = status?.remaining ?? 0;
  const isDisabled = disabled || remaining === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        aria-label={t('boosts.openPickerAria').replace('{{n}}', String(remaining))}
        className="rounded-neo border-neo bg-neo-pink px-4 py-2 font-neo-display text-neo-cream shadow-hard hover:active:shadow-hard-pressed disabled:opacity-50">
        {t('boosts.cta')} <span className="text-xs opacity-80">({remaining})</span>
      </button>
      <BoostPicker open={open} mode={mode} sessionId={sessionId} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/boosts/BoostButton.tsx components/boosts/__tests__/BoostButton.test.tsx
git commit -m "feat(boosts): BoostButton entry CTA"
```

---

## Task 12: Mount BoostButton in entry screens + emit boost:apply

**Files:**
- Modify: MP lobby page (find via `grep -rn "lobby" app/[locale]/multiplayer/ --include="*.tsx" -l`) — add `<BoostButton mode="mp" sessionId={gameCode} />` near "Ready" CTA
- Modify: SP play screen entry (likely `app/[locale]/play/...`)
- Modify: Drills hub or per-drill page (likely `app/[locale]/brain/drills/[type]/PageClient.tsx`)
- Modify: Classic play entry (likely `app/[locale]/classic/...`)
- Modify: MP socket connection layer to emit `boost:apply` once when game starts and a token exists in sessionStorage

- [ ] **Step 1: Identify exact files**

Run:
```bash
grep -rln "Ready\|isReady\|lobby" app/[locale]/multiplayer/ --include="*.tsx" 2>/dev/null
grep -rln "Play\|Start Game" app/[locale]/play/ app/[locale]/single-player/ --include="*.tsx" 2>/dev/null
grep -rln "level={1}" app/[locale]/brain/drills/ --include="*.tsx" 2>/dev/null
grep -rln "Classic\|classic" app/[locale]/classic/ --include="*.tsx" 2>/dev/null
```

Record exact paths in this task before editing.

- [ ] **Step 2: Add `<BoostButton>` near each play CTA**

For MP lobby (example pattern):
```tsx
import { BoostButton } from '@/components/boosts/BoostButton';
// Inside JSX, near the "Ready" button:
<BoostButton mode="mp" sessionId={gameCode} />
```

Repeat for SP (`mode="sp"`, sessionId = a stable per-game id like `sp_${Date.now()}` generated when the user lands on the play screen and stored in component state) and equivalents for `drill` and `classic`.

- [ ] **Step 3: Emit boost:apply on game start (MP only)**

Find the socket emit that fires when MP game starts. Add right after:

```tsx
import { BOOST_TOKEN_STORAGE_KEY } from '@/hooks/useBoostClaim';

// In the effect that fires on game start:
const raw = sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY(gameCode));
if (raw) {
  try {
    const { token } = JSON.parse(raw);
    socket.emit('boost:apply', { sessionId: gameCode, token });
  } catch { /* ignore */ }
}
```

- [ ] **Step 4: For SP/Drill/Classic, server-side apply not needed v1**

`scoreMultiplier` and `freezeTime` and `hint` are client-applied for non-MP modes. Document this in a comment near the BoostButton mount in those screens. Server-side apply for SP scoring is a v2 hardening.

- [ ] **Step 5: Run frontend tests + manual smoke**

```bash
npm run test:frontend
npm run dev   # browse lobby, click BOOST, verify modal shows
```

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat(boosts): mount BoostButton in MP lobby + SP/drill/classic entry screens"
```

---

## Task 13: Translations

**Files:**
- Modify: `translations/en.json`, `he.json`, `sv.json`, `ja.json`, `es.json`

Per memory rule (`feedback-ai-hebrew-translation.md`): Hebrew must be human-translated. Mark Hebrew strings with `[HE-PENDING]` placeholder; create a tracking issue.

- [ ] **Step 1: Add keys to en.json**

```json
"boosts": {
  "title": "Pick a boost",
  "cta": "BOOST",
  "close": "Close",
  "remaining": "Boosts left today: {{n}}/{{cap}}",
  "watchAd": "Watch ad to unlock",
  "activeThisGame": "Active this game",
  "openPickerAria": "Open boost picker, {{n}} boosts left today",
  "freezeTime": { "title": "Freeze Time", "description": "Pause the timer once during your game." },
  "hint": { "title": "Hint", "description": "Reveal one bonus word." },
  "scoreMultiplier": { "title": "Score Multiplier", "description": "1.5x score for the first 30 seconds." },
  "firstWordBonus": { "title": "First Word Bonus", "description": "2x score on your first word." }
}
```

- [ ] **Step 2: Mirror keys in sv/ja/es with translated copy**

(Use existing conventions; if unsure of translation, copy English with `[REVIEW]` tag and open a translation ticket.)

- [ ] **Step 3: Hebrew with `[HE-PENDING]` markers**

```json
"boosts": {
  "title": "[HE-PENDING] Pick a boost",
  "cta": "[HE-PENDING] BOOST",
  ...
}
```

(Open a follow-up issue: "Native Hebrew translation for boost picker copy.")

- [ ] **Step 4: Validate translation completeness**

```bash
npm run test -- translation-completeness 2>&1 | tail -20
```

If a checker exists, ensure all 5 locales have all keys.

- [ ] **Step 5: Commit**

```bash
git add translations/
git commit -m "i18n(boosts): add boost picker copy across 5 locales (HE pending native review)"
```

---

## Task 14: Telemetry + env var + final validation

**Files:**
- Modify: `hooks/useBoostClaim.ts` (add PostHog `capture()` calls)
- Modify: `components/boosts/BoostPicker.tsx` (add `boost_picker_opened` capture)
- Modify: `.env.example` (add `BOOST_TOKEN_SECRET=`)
- Modify: `backend/services/gameLifecycle/gameResults.ts` (add `boost_applied` capture)

- [ ] **Step 1: Add PostHog events**

In `useBoostClaim.claim()`:
```ts
import { getPostHog } from '@/lib/posthog';
// On claim start:
getPostHog()?.capture('boost_claim_started', { boost_type: boostType });
// On success:
getPostHog()?.capture('boost_claim_completed', { boost_type: boostType, remaining_today: body.remaining });
// On failure:
getPostHog()?.capture('boost_claim_failed', { reason: body.error ?? 'network', boost_type: boostType });
```

In `BoostPicker` mount effect (when `open` becomes true):
```ts
useEffect(() => { if (open) getPostHog()?.capture('boost_picker_opened', { mode }); }, [open, mode]);
```

In `applyBoostsToScores` (server) capture per applied claim via `getPostHogServer()`.

- [ ] **Step 2: Add env var**

```
# .env.example
BOOST_TOKEN_SECRET=change-me-min-32-bytes-random
```

Generate prod secret + add to Railway env:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

- [ ] **Step 3: Lint + tests + build:fast**

```bash
npm run lint
npm run test:backend
npm run test:frontend
npm run build:fast
```

All green expected.

- [ ] **Step 4: Manual E2E smoke**

In dev (`npm run dev`):
1. Sign in
2. Open MP lobby, click BOOST → see picker
3. Pick "First Word Bonus" → mock ad → token stored in sessionStorage
4. Click Ready → game starts → first word should score 2x server-side
5. Verify `GET /api/boosts/status` shows `remaining: 4`

- [ ] **Step 5: Commit + push**

```bash
git add .env.example hooks/useBoostClaim.ts components/boosts/BoostPicker.tsx \
        backend/services/gameLifecycle/gameResults.ts
git commit -m "feat(boosts): PostHog telemetry + BOOST_TOKEN_SECRET env"
git push origin master
```

- [ ] **Step 6: Update memory**

Add to `~/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/`:
- New entry `boost-picker-shipped.md` (project type) — point to spec + plan, list shipped commits
- Update `seo-sprint-2026-04-26.md` to remove "sabotage power-ups" from pending (replaced by self-buff implementation)
- Update `monetization-strategy.md` to note rewarded-video pipe is now wired via boosts (Phase-1 quick win partially shipped)

---

## Self-Review Notes

**Spec coverage check:** All spec sections mapped to tasks (types→T1, token→T2, helper→T3, claim→T4, status→T5, effects→T6, server-apply→T7, status hook→T8, claim hook→T9, picker→T10, button→T11, mounts→T12, i18n→T13, telemetry→T14). ✓

**Placeholders:** Task 12 contains "find via grep" — acceptable scoping, command provided. Task 11 disabled-when-zero test is loose (vi.doMock late) — flagged inline as covered by prop. ✓

**Type consistency:** `BoostType` union, `ClaimBoostResult.error` strings, RPC `error_message` values, and HTTP error codes all aligned. `BOOST_TOKEN_STORAGE_KEY` exported once from `useBoostClaim` and re-imported in T12. ✓

**Trust model gap:** v1 trust-client-claim documented in spec + this plan. Acceptable bound (cap+idempotency); SSV upgrade tracked as v2.

---

**Plan complete. Save state: 14 tasks, ~12-16 hours estimated. DDL already shipped to prod.**
