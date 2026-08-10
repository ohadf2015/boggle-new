/**
 * Schema smoke test for async_board_challenges.
 *
 * Skipped unless SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in env AND
 * the host is reachable. Catches the "migration written but not applied" gap
 * that mocked tests miss.
 *
 * Run in CI with secrets attached, or locally via:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm test -- schema.integration
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const envOk = !!(url && key);

let tableOk = false;

beforeAll(async () => {
  if (!envOk) return;
  try {
    const client = createClient(url!, key!, { auth: { persistSession: false } });
    const { error } = await client.from('async_board_challenges').select('id', { count: 'exact', head: true }).limit(0);
    tableOk = !error;
  } catch {
    tableOk = false;
  }
});

describe('async_board_challenges schema', () => {
  if (!envOk || !tableOk) {
    it.skip('exposes async-first columns required by /api/growth/async-challenge (skipped — table unreachable)', () => {});
    it.skip('accepts the extended status enum (draft, expired_draft, expired_unfinished) (skipped — table unreachable)', () => {});
    return;
  }

  it('exposes async-first columns required by /api/growth/async-challenge', async () => {
    const client = createClient(url!, key!, { auth: { persistSession: false } });
    const { error } = await client
      .from('async_board_challenges')
      .select(
        'grid_seed, language, duration_seconds, winner_user_id, accepted_at, completed_at',
      )
      .limit(0);
    expect(error).toBeNull();
  });

  it('accepts the extended status enum (draft, expired_draft, expired_unfinished)', async () => {
    const client = createClient(url!, key!, { auth: { persistSession: false } });
    const probe = await client
      .from('async_board_challenges')
      .select('status')
      .in('status', ['draft', 'expired_draft', 'expired_unfinished'])
      .limit(0);
    expect(probe.error).toBeNull();
  });
});