/**
 * School-identity links (public.external_identities). Server-only: every write goes
 * through the service-role client. Emails are reduced to a sha256 hex before they
 * leave this module, so no raw school email is ever stored.
 */

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { EXTERNAL_PROVIDERS, type ExternalProvider } from './externalIdentityFlags';

export { EXTERNAL_PROVIDERS, isIdentityLinkingEnabled, providerFromSupabase } from './externalIdentityFlags';
export type { ExternalProvider } from './externalIdentityFlags';

const TABLE = 'external_identities';

export function hashEmail(email: string | null | undefined): string | null {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

export interface LinkInput {
  userId: string;
  provider: ExternalProvider;
  externalId: string;
  email?: string | null;
}

export type LinkResult =
  | { ok: true; status: 'linked' | 'unchanged' }
  | { ok: false; reason: 'invalid' | 'conflict' | 'db_error' };

export async function linkExternalIdentity(admin: SupabaseClient, input: LinkInput): Promise<LinkResult> {
  const externalId = (input.externalId ?? '').trim();
  if (!input.userId || !externalId || !(EXTERNAL_PROVIDERS as readonly string[]).includes(input.provider)) {
    return { ok: false, reason: 'invalid' };
  }
  const emailHash = hashEmail(input.email);

  const { data: existing, error: readErr } = await admin
    .from(TABLE)
    .select('user_id, email_hash')
    .eq('provider', input.provider)
    .eq('external_id', externalId)
    .maybeSingle();
  if (readErr) {
    logger.error('[external-identity] lookup failed', readErr);
    return { ok: false, reason: 'db_error' };
  }

  if (existing) {
    const row = existing as { user_id: string; email_hash: string | null };
    if (row.user_id !== input.userId) {
      logger.warn('[external-identity] identity already linked to another account', { provider: input.provider });
      return { ok: false, reason: 'conflict' };
    }
    if (!emailHash || row.email_hash === emailHash) return { ok: true, status: 'unchanged' };
    const { error } = await admin
      .from(TABLE)
      .update({ email_hash: emailHash })
      .eq('provider', input.provider)
      .eq('external_id', externalId);
    if (error) {
      logger.error('[external-identity] hash refresh failed', error);
      return { ok: false, reason: 'db_error' };
    }
    return { ok: true, status: 'linked' };
  }

  const { error: insErr } = await admin.from(TABLE).insert({
    user_id: input.userId,
    provider: input.provider,
    external_id: externalId,
    email_hash: emailHash,
  });
  if (insErr) {
    // A concurrent insert of the same identity lands here as a unique violation.
    if ((insErr as { code?: string }).code === '23505') return { ok: false, reason: 'conflict' };
    logger.error('[external-identity] insert failed', insErr);
    return { ok: false, reason: 'db_error' };
  }
  return { ok: true, status: 'linked' };
}

export async function findUserByExternalIdentity(
  admin: SupabaseClient,
  provider: ExternalProvider,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from(TABLE)
    .select('user_id')
    .eq('provider', provider)
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) {
    logger.error('[external-identity] find failed', error);
    return null;
  }
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

export interface LinkedIdentity {
  userId: string;
  externalId: string;
  emailHash: string | null;
}

/** Throws on a read error so callers choose their own fallback. */
export async function listLinkedIdentities(
  admin: SupabaseClient,
  provider: ExternalProvider,
  userIds: string[],
): Promise<LinkedIdentity[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .from(TABLE)
    .select('user_id, external_id, email_hash')
    .eq('provider', provider)
    .in('user_id', userIds);
  if (error) throw new Error(`external_identities read failed: ${error.message}`);
  return ((data as Array<{ user_id: string; external_id: string; email_hash: string | null }>) ?? []).map((r) => ({
    userId: r.user_id,
    externalId: r.external_id,
    emailHash: r.email_hash,
  }));
}
