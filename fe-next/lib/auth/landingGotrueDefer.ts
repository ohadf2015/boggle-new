import { isLandingPath } from '@/lib/i18n/isLandingPath';

/**
 * Landing (`/` `/en` / …) must not pull @supabase/gotrue into the eager
 * bundle or the no-interaction PSI trace. Every other route keeps auth eager.
 * Once the AuthProvider chunk has evaluated, later landing events may use it.
 */
export function shouldDeferLandingGotrue(
  pathname: string | null | undefined,
  authProviderMounted: boolean,
): boolean {
  if (authProviderMounted) return false;
  return isLandingPath(pathname ?? '');
}
