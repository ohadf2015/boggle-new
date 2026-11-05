/**
 * Exact email → auth user, via GoTrue's admin filter. listUsers paging scans
 * the whole project and is the wrong shape for a student waiting on a phone.
 * The filter is a substring; the caller still exact-matches.
 */

export interface FoundAuthUser {
  id: string;
  emailConfirmedAt: string | null;
}

export type FindAuthUserResult =
  | { user: FoundAuthUser | null }
  | { error: string };

interface AuthUserRow {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}

export async function findAuthUserByEmail(
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FindAuthUserResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return { error: 'admin not configured' };

  const target = email.trim().toLowerCase();
  let res: Response;
  try {
    res = await fetchImpl(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(target)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'lookup failed' };
  }
  if (!res.ok) return { error: `lookup ${res.status}` };

  let body: { users?: AuthUserRow[] };
  try {
    body = (await res.json()) as { users?: AuthUserRow[] };
  } catch {
    return { error: 'lookup unreadable' };
  }
  const hit = (body.users ?? []).find((row) => (row.email || '').toLowerCase() === target);
  if (!hit?.id) return { user: null };
  return { user: { id: hit.id, emailConfirmedAt: hit.email_confirmed_at ?? null } };
}
