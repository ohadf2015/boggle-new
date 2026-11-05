export class AuthClientLoadError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Could not load the sign-in client');
    this.cause = cause;
    this.name = 'AuthClientLoadError';
  }
}

export async function loadAuthClient() {
  try {
    return await import('@/lib/supabase');
  } catch (cause) {
    throw new AuthClientLoadError(cause);
  }
}

export function isAuthClientConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export const AUTH_CLIENT_LOAD_FAILED_EVENT = 'lc:auth-client-load-failed';
