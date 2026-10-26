import { isIdentityLinkingEnabled, providerFromSupabase } from './externalIdentityFlags';

interface SessionLike {
  access_token?: string;
  user?: { identities?: Array<{ provider?: string }> | null } | null;
}

let firedThisPageLoad = false;

/** Fire-and-forget on SIGNED_IN; the server reads the identities itself and is idempotent. */
export async function triggerExternalIdentityLink(session: SessionLike | null | undefined): Promise<void> {
  if (!isIdentityLinkingEnabled() || firedThisPageLoad || !session?.access_token) return;
  if (!(session.user?.identities ?? []).some((i) => providerFromSupabase(i.provider))) return;
  firedThisPageLoad = true;
  try {
    await fetch('/api/auth/external-identity', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      keepalive: true,
    });
  } catch {
    // Best-effort: the next sign-in retries.
  }
}
