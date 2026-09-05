import type { SupabaseClient } from '@supabase/supabase-js';

export interface FindUserIdByEmailResult {
  userId: string | null;
  error?: string;
}

const PAGE_SIZE = 200;
// 50 pages * 200/page = 10,000 users scanned worst case. Any real hit lands in the
// first page or two; this ceiling only protects against looping forever on a
// dataset this lookup was never sized for.
const MAX_PAGES = 50;

/**
 * Email -> auth.users.id via the Admin Auth API (`listUsers`), not a bespoke
 * SQL function. A SECURITY DEFINER RPC needs its own migration applied before
 * it can be called at all — `find_user_id_by_email` (added 2026-09-05) sat
 * unapplied in production for months because the Supabase CLI token behind
 * the migrations workflow had expired, so every admin Pro grant that needed
 * it failed at the very first step, long before the timeout fixes in #940/#941
 * had anything to do with it. `listUsers` is intrinsic to Supabase Auth —
 * nothing to deploy, nothing that can be "still pending".
 *
 * This is the same listUsers-and-match-client-side pattern already used ad hoc
 * by lib/email.ts and lib/reengagementEmail.ts, promoted to one shared,
 * paginated, early-exit helper so the next email-keyed admin feature reuses
 * it instead of growing another copy (or another migration-gated RPC).
 */
export async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<FindUserIdByEmailResult> {
  const target = email.trim().toLowerCase();
  if (!target) return { userId: null };

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return { userId: null, error: error.message };
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return { userId: hit.id };
    if (users.length < PAGE_SIZE) break;
  }
  return { userId: null };
}
