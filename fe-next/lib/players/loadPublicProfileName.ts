import type { SupabaseClient } from '@supabase/supabase-js';
import { publicNameOrNull } from '@/lib/names/publicName';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_RE = /^[\p{L}\p{N}_.-]{1,40}$/u;
const DEFAULT_TIMEOUT_MS = 1500;

type ProfileKey = { id?: string; username?: string };

async function lookup(db: SupabaseClient, col: 'id' | 'username', val: string): Promise<string | null> {
  const { data: profile, error } = await db.from('profiles').select('id, display_name').eq(col, val).maybeSingle();
  if (error || !profile) return null;
  const { id, display_name } = profile as { id: string; display_name: string | null };
  const [students, consents] = await Promise.all([
    db.from('classroom_memberships').select('student_id').eq('student_id', id).limit(1),
    db.from('parental_consents').select('user_id').eq('user_id', id).limit(1),
  ]);
  if (students.error || consents.error) return null;
  if ((students.data ?? []).length || (consents.data ?? []).length) return null;
  return publicNameOrNull(display_name);
}

/**
 * A player's name fit for a link preview, or null. Never a username fallback,
 * never a student's or consent-gated player's name; fails closed and fast.
 */
export async function loadPublicProfileName(
  db: SupabaseClient | null,
  key: ProfileKey,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string | null> {
  if (!db) return null;
  const col = key.id ? 'id' : 'username';
  const val = key.id ?? key.username ?? '';
  if (col === 'id' ? !UUID_RE.test(val) : !USERNAME_RE.test(val)) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
  try {
    return await Promise.race([lookup(db, col, val).catch(() => null), cap]);
  } finally {
    clearTimeout(timer);
  }
}
