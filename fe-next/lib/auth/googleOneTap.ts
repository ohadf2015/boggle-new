import { supabase } from '@/lib/supabase';

/**
 * Google One Tap / Sign In With Google (web).
 *
 * This is the in-page ID-token flow: Google Identity Services mints an ID token
 * against our JavaScript origin and we hand it straight to Supabase via
 * `signInWithIdToken`. Unlike `signInWithOAuth`, there is NO browser redirect
 * through `<ref>.supabase.co`, so Google's consent UI shows OUR domain.
 *
 * The native (Capacitor) app already uses `signInWithIdToken` in
 * `utils/nativeOAuth.ts`; this is the equivalent for the web surface.
 */

type AuthClientLike = {
  signInWithIdToken: (args: {
    provider: 'google';
    token: string;
    nonce?: string;
  }) => Promise<{ data: { session: unknown } | null; error: { message: string } | null }>;
};

export interface OneTapNonce {
  /** Sent to Supabase (`signInWithIdToken`) — compared against the hash in the ID token. */
  rawNonce: string;
  /** SHA-256 hex of the raw nonce — sent to Google (`initialize({ nonce })`). */
  hashedNonce: string;
}

export interface OneTapExchangeResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a nonce pair for the One Tap flow.
 * Google embeds `hashedNonce` in the issued ID token; Supabase re-hashes the
 * `rawNonce` we pass and verifies it matches — preventing token replay.
 */
export async function generateOneTapNonce(): Promise<OneTapNonce> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const rawNonce = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { rawNonce, hashedNonce };
}

/**
 * Exchange a Google credential (ID token) for a Supabase session.
 * On success, Supabase fires `SIGNED_IN`, which the existing
 * `onAuthStateChange` listener propagates — identical to every other login.
 */
export async function exchangeGoogleOneTapCredential(
  credential: string,
  rawNonce: string,
  auth: AuthClientLike | null | undefined = supabase?.auth,
): Promise<OneTapExchangeResult> {
  if (!auth) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await auth.signInWithIdToken({
      provider: 'google',
      token: credential,
      nonce: rawNonce,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data?.session) {
      return { success: false, error: 'No session created' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' };
  }
}

/** Shape of the Google Identity Services credential callback response. */
export interface GoogleCredentialResponse {
  credential?: string;
}

interface OneTapCallbackDeps {
  rawNonce: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  exchange?: (credential: string, rawNonce: string) => Promise<OneTapExchangeResult>;
}

/**
 * Build the GIS credential callback. Kept pure (exchange injectable) so the
 * sign-in wiring is unit-tested; the hook just feeds Google's response in.
 */
export function createOneTapCallback({
  rawNonce,
  onSuccess,
  onError,
  exchange = exchangeGoogleOneTapCredential,
}: OneTapCallbackDeps): (response: GoogleCredentialResponse) => Promise<void> {
  return async (response: GoogleCredentialResponse) => {
    if (!response?.credential) return;
    const result = await exchange(response.credential, rawNonce);
    if (result.success) {
      onSuccess();
    } else {
      onError(result.error ?? 'Sign in failed');
    }
  };
}

export interface OneTapEnableInput {
  isNativePlatform: boolean;
  clientId: string | undefined;
  supabaseConfigured: boolean;
  isAuthenticated: boolean;
}

/**
 * One Tap is a WEB-only enhancement. Native uses the SDK; authenticated users
 * don't need it; it requires a Google web client id + a configured Supabase.
 */
export function shouldEnableGoogleOneTap(input: OneTapEnableInput): boolean {
  return (
    !input.isNativePlatform &&
    !!input.clientId &&
    input.supabaseConfigured &&
    !input.isAuthenticated
  );
}
