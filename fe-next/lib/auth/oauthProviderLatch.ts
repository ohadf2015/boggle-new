const KEY = 'lexiclash_oauth_provider_pending';

/** Same-tab OAuth redirect keeps sessionStorage. The callback reads it to name the provider. */
export function latchOAuthProvider(provider: string): void {
  try {
    sessionStorage.setItem(KEY, provider);
  } catch {
    /* private mode or SSR */
  }
}

export function peekOAuthProvider(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearOAuthProvider(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode or SSR */
  }
}
