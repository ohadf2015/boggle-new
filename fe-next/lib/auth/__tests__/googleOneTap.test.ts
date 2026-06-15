import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateOneTapNonce,
  exchangeGoogleOneTapCredential,
  shouldEnableGoogleOneTap,
  createOneTapCallback,
  ensureGoogleIdInitialized,
  __resetGoogleIdInitForTests,
} from '../googleOneTap';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('generateOneTapNonce', () => {
  it('returns a raw nonce and its SHA-256 hex hash', async () => {
    const { rawNonce, hashedNonce } = await generateOneTapNonce();

    expect(typeof rawNonce).toBe('string');
    expect(rawNonce.length).toBeGreaterThanOrEqual(32);
    expect(hashedNonce).toBe(await sha256Hex(rawNonce));
  });

  it('produces a different raw nonce on each call', async () => {
    const a = await generateOneTapNonce();
    const b = await generateOneTapNonce();
    expect(a.rawNonce).not.toBe(b.rawNonce);
  });
});

describe('exchangeGoogleOneTapCredential', () => {
  it('exchanges the Google credential for a Supabase session using the RAW nonce', async () => {
    const signInWithIdToken = vi
      .fn()
      .mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null });

    const result = await exchangeGoogleOneTapCredential('id-token-abc', 'raw-nonce-123', {
      signInWithIdToken,
    });

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'id-token-abc',
      nonce: 'raw-nonce-123',
    });
    expect(result).toEqual({ success: true });
  });

  it('returns the error message when Supabase rejects the token', async () => {
    const signInWithIdToken = vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: { message: 'bad token' } });

    const result = await exchangeGoogleOneTapCredential('t', 'n', { signInWithIdToken });

    expect(result).toEqual({ success: false, error: 'bad token' });
  });

  it('fails gracefully when no auth client is available', async () => {
    const result = await exchangeGoogleOneTapCredential('t', 'n', null);
    expect(result.success).toBe(false);
  });
});

describe('createOneTapCallback', () => {
  it('exchanges the credential and calls onSuccess on success', async () => {
    const exchange = vi.fn().mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const cb = createOneTapCallback({ rawNonce: 'raw-1', onSuccess, onError, exchange });
    await cb({ credential: 'tok-1' });

    expect(exchange).toHaveBeenCalledWith('tok-1', 'raw-1');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError with the message on failure', async () => {
    const exchange = vi.fn().mockResolvedValue({ success: false, error: 'bad token' });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const cb = createOneTapCallback({ rawNonce: 'raw-1', onSuccess, onError, exchange });
    await cb({ credential: 'tok-1' });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('bad token');
  });

  it('ignores a response with no credential', async () => {
    const exchange = vi.fn();
    const cb = createOneTapCallback({ rawNonce: 'raw-1', onSuccess: vi.fn(), onError: vi.fn(), exchange });
    await cb({ credential: undefined });
    expect(exchange).not.toHaveBeenCalled();
  });
});

describe('ensureGoogleIdInitialized', () => {
  beforeEach(() => __resetGoogleIdInitForTests());

  function makeGoogle() {
    return {
      accounts: { id: { initialize: vi.fn(), prompt: vi.fn(), renderButton: vi.fn() } },
    };
  }

  it('initializes GIS once with our client id, a nonce, FedCM, and a callback', async () => {
    const google = makeGoogle();
    await ensureGoogleIdInitialized(google, 'cid-123');

    expect(google.accounts.id.initialize).toHaveBeenCalledTimes(1);
    const cfg = google.accounts.id.initialize.mock.calls[0][0];
    expect(cfg.client_id).toBe('cid-123');
    expect(typeof cfg.nonce).toBe('string');
    expect(cfg.nonce.length).toBeGreaterThan(0);
    expect(cfg.use_fedcm_for_prompt).toBe(true);
    expect(typeof cfg.callback).toBe('function');
  });

  it('is idempotent — a second call does not re-initialize', async () => {
    const google = makeGoogle();
    await ensureGoogleIdInitialized(google, 'cid-123');
    await ensureGoogleIdInitialized(google, 'cid-123');
    expect(google.accounts.id.initialize).toHaveBeenCalledTimes(1);
  });
});

describe('shouldEnableGoogleOneTap', () => {
  const base = {
    isNativePlatform: false,
    clientId: 'client-123.apps.googleusercontent.com',
    supabaseConfigured: true,
    isAuthenticated: false,
  };

  it('enables on web for a configured, unauthenticated user', () => {
    expect(shouldEnableGoogleOneTap(base)).toBe(true);
  });

  it('disables on the native (Capacitor) platform', () => {
    expect(shouldEnableGoogleOneTap({ ...base, isNativePlatform: true })).toBe(false);
  });

  it('disables when the Google client id is missing', () => {
    expect(shouldEnableGoogleOneTap({ ...base, clientId: '' })).toBe(false);
  });

  it('disables when Supabase is not configured', () => {
    expect(shouldEnableGoogleOneTap({ ...base, supabaseConfigured: false })).toBe(false);
  });

  it('disables when the user is already authenticated', () => {
    expect(shouldEnableGoogleOneTap({ ...base, isAuthenticated: true })).toBe(false);
  });
});
