/**
 * Set when the AuthProvider chunk evaluates. Landing PSI must not download
 * @supabase/gotrue until that chunk is actually imported (first interaction
 * on `/` `/en`, immediately on every other route).
 */
const FLAG = '__lcAuthProviderMounted';

export function markAuthProviderMounted(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, boolean>)[FLAG] = true;
}

export function isAuthProviderMounted(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as Record<string, boolean>)[FLAG] === true;
}
