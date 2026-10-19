/**
 * Async loader for the browser Supabase client.
 * Callers on the landing graph must use this instead of a static import so
 * @supabase/gotrue stays out of the eager /en bundle (PSI). The chunk is
 * fetched only when a signed-in call actually needs the client.
 */
export async function loadSupabaseClient() {
  const { createClient } = await import(
    /* webpackPrefetch: false, webpackPreload: false */
    './client'
  );
  return createClient();
}
