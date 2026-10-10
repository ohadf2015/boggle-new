/**
 * Cookie-free anon client for public, read-only queries (leaderboards, stats).
 * Does not call cookies(), so it is safe in ISR/static pages.
 */
export { getAnonClient as createSupabasePublicClient } from '@/utils/supabase/admin';
