import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

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

/** Minimal shape of the global `window.google.accounts.id` we depend on. */
export interface GoogleIdServices {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      prompt: (listener?: (notification: unknown) => void) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

let idInitialized = false;

/**
 * `google.accounts.id.initialize` is a GLOBAL singleton — the last call wins.
 * One Tap (prompt) and the rendered button must therefore share ONE init with a
 * single nonce + callback. This initializes exactly once per page load; both the
 * One Tap initializer and the Sign-In button call it before prompt()/renderButton().
 * Success flows through Supabase `SIGNED_IN` (AuthContext), so the callback needs
 * no per-caller success wiring.
 */
export async function ensureGoogleIdInitialized(
  google: GoogleIdServices | null | undefined,
  clientId: string,
  /** Site language ('en' | 'he' | 'sv' | 'ja' | 'es' | 'ru'). GSI otherwise
   *  falls back to the BROWSER locale, so a visitor on /he with a Dutch
   *  browser sees "Doorgaan met Google" on a Hebrew page. Passing the site
   *  locale keeps the button + One Tap prompt in the page's language. */
  locale?: string,
): Promise<void> {
  if (idInitialized) return;
  if (!google?.accounts?.id) return;

  const { rawNonce, hashedNonce } = await generateOneTapNonce();
  const callback = createOneTapCallback({
    rawNonce,
    onSuccess: () => logger.log('[GoogleAuth] sign-in successful'),
    onError: (message) => logger.debug('[GoogleAuth] sign-in failed:', message),
  });

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: GoogleCredentialResponse) => void callback(response),
    nonce: hashedNonce,
    use_fedcm_for_prompt: true,
    auto_select: false,
    cancel_on_tap_outside: true,
    ...(locale ? { locale } : {}),
  });
  idInitialized = true;
}

/** Test-only: reset the one-time init latch. */
export function __resetGoogleIdInitForTests(): void {
  idInitialized = false;
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
