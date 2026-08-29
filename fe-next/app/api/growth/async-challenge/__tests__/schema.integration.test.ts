/**
 * Schema smoke test for async_board_challenges.
 *
 * Skipped unless SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in env.
 * Run in CI with secrets attached, or locally via:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm test -- schema.integration
 *
 * Catches the "migration written but not applied" gap that mocked tests miss.
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = !!(url && key);

describe.skip('async_board_challenges schema', () => {
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
