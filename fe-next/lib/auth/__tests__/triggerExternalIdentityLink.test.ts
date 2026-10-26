import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const session = (providers: string[]) => ({
  access_token: 'tok',
  user: { identities: providers.map((provider) => ({ provider })) },
});

describe('triggerExternalIdentityLink', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends nothing while the flag is off', async () => {
    const { triggerExternalIdentityLink } = await import('../triggerExternalIdentityLink');
    await triggerExternalIdentityLink(session(['google']));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing for a session without a Google or Microsoft identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const { triggerExternalIdentityLink } = await import('../triggerExternalIdentityLink');
    await triggerExternalIdentityLink(session(['discord', 'email']));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts once per page load with the bearer token and no identity payload', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const { triggerExternalIdentityLink } = await import('../triggerExternalIdentityLink');
    await triggerExternalIdentityLink(session(['azure']));
    await triggerExternalIdentityLink(session(['google']));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/external-identity');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.body).toBeUndefined();
  });

  it('swallows a network failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const { triggerExternalIdentityLink } = await import('../triggerExternalIdentityLink');
    await expect(triggerExternalIdentityLink(session(['google']))).resolves.toBeUndefined();
  });
});
