import type { SupabaseClient } from '@supabase/supabase-js';
import { linkExternalIdentity, providerFromSupabase } from './externalIdentity';

interface IdentityLike {
  provider?: string;
  id?: string;
  identity_data?: { sub?: unknown; email?: unknown } | null;
}

export interface SignInUserLike {
  id: string;
  is_anonymous?: boolean;
  identities?: IdentityLike[] | null;
}

/** Links the user's Google / Microsoft sign-in identities. Identities come from the server-side user, never the client. */
export async function recordSignInIdentities(
  admin: SupabaseClient,
  user: SignInUserLike,
): Promise<{ linked: number; skipped: number }> {
  const out = { linked: 0, skipped: 0 };
  if (user.is_anonymous) return out;
  for (const identity of user.identities ?? []) {
    const provider = providerFromSupabase(identity.provider);
    if (!provider) continue;
    const sub = identity.identity_data?.sub;
    const externalId = typeof sub === 'string' && sub ? sub : identity.id ?? '';
    const email = typeof identity.identity_data?.email === 'string' ? identity.identity_data.email : null;
    const res = await linkExternalIdentity(admin, { userId: user.id, provider, externalId, email });
    if (res.ok) out.linked += 1;
    else out.skipped += 1;
  }
  return out;
}
