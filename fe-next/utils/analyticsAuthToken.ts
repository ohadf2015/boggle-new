/**
 * Session token for analytics auth headers.
 *
 * Landing PSI: this module must NEVER statically import '@/lib/supabase' (or any
 * '@supabase/*') — growthTracking statically imports THIS module and sits in the
 * landing chunk, so a static edge here would drag @supabase/gotrue back into the
 * eager landing bundle (see app/__tests__/landing-gotrue-defer.test.ts). The
 * dynamic import keeps the client in its own on-demand chunk.
 */
export async function getAnalyticsSessionToken(): Promise<string | null> {
  try {
    const { getSession } = await import('@/lib/supabase');
    const { data } = await getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}
