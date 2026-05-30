import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * triggerWelcomeEmail is fire-and-forget client glue. The server is the source
 * of truth (idempotent), but we test the bespoke client logic: UI-locale
 * extraction from the path, the bearer header, and the dedupe guards.
 */

function setPath(path: string) {
  Object.defineProperty(window, 'location', {
    value: { pathname: path },
    writable: true,
  });
}

describe('triggerWelcomeEmail', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules(); // reset module-level firedThisPageLoad guard between cases
    window.sessionStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/email/send-welcome with the UI locale from the path and a bearer token', async () => {
    setPath('/he/word-craft');
    const { triggerWelcomeEmail } = await import('../triggerWelcomeEmail');

    await triggerWelcomeEmail('tok-abc');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/email/send-welcome');
    expect(JSON.parse(init.body)).toEqual({ locale: 'he' });
    expect(init.headers.Authorization).toBe('Bearer tok-abc');
  });

  it('falls back to "en" for an unsupported path locale', async () => {
    setPath('/fr/multiplayer');
    const { triggerWelcomeEmail } = await import('../triggerWelcomeEmail');

    await triggerWelcomeEmail('tok');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ locale: 'en' });
  });

  it('fires at most once per page load (in-memory guard)', async () => {
    setPath('/en');
    const { triggerWelcomeEmail } = await import('../triggerWelcomeEmail');

    await triggerWelcomeEmail('tok');
    await triggerWelcomeEmail('tok');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fire when this browser session already tried (sessionStorage guard)', async () => {
    setPath('/en');
    window.sessionStorage.setItem('lc_welcome_email_tried', '1');
    const { triggerWelcomeEmail } = await import('../triggerWelcomeEmail');

    await triggerWelcomeEmail('tok');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
