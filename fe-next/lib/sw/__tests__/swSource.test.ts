import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { SW_SOURCE, SW_CACHE_NAME } from '../swSource';
import { offlineCapableRoutes } from '@/lib/offline/offlineCapableModes';
import { locales } from '@/i18n/config';

describe('swSource', () => {
  it('emits a syntactically valid script (compiles without throwing)', () => {
    // Compile-only: parses the source but does NOT execute it (no `self`,
    // `caches`, etc. in scope). Catches any template-literal escaping slip.
    expect(() => new vm.Script(SW_SOURCE)).not.toThrow();
  });

  it('precaches every offline-capable route (no drift from the allowlist)', () => {
    for (const route of offlineCapableRoutes()) {
      expect(SW_SOURCE).toContain(`"${route}"`);
    }
  });

  it('precaches each locale home (navigation-fallback targets)', () => {
    for (const loc of locales) {
      expect(SW_SOURCE).toContain(`"/${loc}"`);
    }
  });

  it('precaches the bare / home shell (native WebView start URL)', () => {
    expect(SW_SOURCE).toMatch(/OFFLINE_SHELL_ROUTES = \["\/"/);
  });

  it('registers the three SW lifecycle handlers', () => {
    expect(SW_SOURCE).toContain("addEventListener('install'");
    expect(SW_SOURCE).toContain("addEventListener('activate'");
    expect(SW_SOURCE).toContain("addEventListener('fetch'");
  });

  it('includes the offline navigation fallback', () => {
    expect(SW_SOURCE).toContain('navigationFallback');
  });

  it('un-escapes regex backslashes correctly (single backslash in output)', () => {
    // Template literal `\\/api\\/` must emit the real regex source `\/api\/`.
    expect(SW_SOURCE).toContain('/\\/api\\//');
    expect(SW_SOURCE).not.toContain('\\\\/api'); // no double-backslash leaked
  });

  it('stamps the cache name', () => {
    expect(SW_SOURCE).toContain(SW_CACHE_NAME);
    // Build-stamped so the cache name auto-bumps every deploy (install→activate
    // purges the prior build's caches). 8 digits = dev/test fallback date,
    // up to 14 = a per-build YYYYMMDDHHMMSS stamp from NEXT_PUBLIC_BUILD_TIME.
    expect(SW_CACHE_NAME).toMatch(/^lexiclash-v\d+-\d{8,14}$/);
  });
});

// ── Behavioral harness ──────────────────────────────────────────────────────
// The dictionary endpoint must be offline-first (stale-while-revalidate), not
// network-only — otherwise the 24h IndexedDB TTL re-fetch fails offline and
// every word is rejected. We assert real behavior by executing the SW source in
// a sandbox with mock caches/fetch and firing a synthetic fetch event.

interface MockResponse {
  status: number;
  type: string;
  _body: string;
  clone(): MockResponse;
}

function mockResponse(body: string, status = 200, type = 'basic'): MockResponse {
  return {
    status,
    type,
    _body: body,
    clone() {
      return mockResponse(body, status, type);
    },
  };
}

interface MockRequest {
  url: string;
  method: string;
  mode: string;
  headers: { get(k: string): string | null };
}

function mockRequest(url: string): MockRequest {
  return { url, method: 'GET', mode: 'cors', headers: { get: () => null } };
}

/**
 * Build a fresh SW environment and run SW_SOURCE in it. Returns the captured
 * fetch handler plus the backing cache store so tests can seed/inspect it.
 */
function runSwInSandbox(opts: { fetchImpl: (req: MockRequest) => Promise<MockResponse> }) {
  const store = new Map<string, MockResponse>();
  const keyOf = (req: MockRequest | string) => (typeof req === 'string' ? req : req.url);

  const cache = {
    match: (req: MockRequest | string) => Promise.resolve(store.get(keyOf(req))),
    put: (req: MockRequest | string, res: MockResponse) => {
      store.set(keyOf(req), res);
      return Promise.resolve();
    },
    addAll: () => Promise.resolve(),
    keys: () => Promise.resolve([]),
  };

  const caches = {
    open: () => Promise.resolve(cache),
    match: (req: MockRequest | string) => Promise.resolve(store.get(keyOf(req))),
    keys: () => Promise.resolve([] as string[]),
    delete: () => Promise.resolve(true),
  };

  const handlers: Record<string, (event: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      handlers[type] = fn;
    },
    skipWaiting: () => undefined,
    clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]) },
    location: { origin: 'https://www.lexiclash.live' },
  };

  const context = {
    self,
    caches,
    fetch: (req: MockRequest) => opts.fetchImpl(req),
    URL,
    Response: { error: () => mockResponse('', 0, 'error') },
    console,
  };
  vm.createContext(context);
  new vm.Script(SW_SOURCE).runInContext(context);

  const dispatchFetch = (req: MockRequest): Promise<MockResponse> => {
    let responded: Promise<MockResponse> | null = null;
    const event = {
      request: req,
      respondWith: (p: Promise<MockResponse>) => {
        responded = p;
      },
    };
    handlers.fetch(event);
    return responded ?? Promise.reject(new Error('event not handled (no respondWith)'));
  };

  return { dispatchFetch, store };
}

describe('swSource — dictionary offline-first behavior', () => {
  const DICT_URL = 'https://www.lexiclash.live/api/dictionary-words?lang=en';

  it('serves the cached dictionary when the network is offline', async () => {
    const { dispatchFetch, store } = runSwInSandbox({
      fetchImpl: () => Promise.reject(new Error('offline')),
    });
    // Seed cache as if a prior online fetch had stored it.
    store.set(DICT_URL, mockResponse('apple\nbanana'));

    const res = await dispatchFetch(mockRequest(DICT_URL));
    expect(res._body).toBe('apple\nbanana');
  });

  it('fetches and caches the dictionary on first (online) request', async () => {
    const { dispatchFetch, store } = runSwInSandbox({
      fetchImpl: () => Promise.resolve(mockResponse('cat\ndog')),
    });

    const res = await dispatchFetch(mockRequest(DICT_URL));
    expect(res._body).toBe('cat\ndog');
    // Cached for the next (possibly offline) load.
    await new Promise((r) => setTimeout(r, 0)); // let background put settle
    expect(store.get(DICT_URL)?._body).toBe('cat\ndog');
  });

  it('routes the dictionary endpoint (it must NOT be left to network-only)', () => {
    expect(SW_SOURCE).toContain('/\\/api\\/dictionary-words/');
  });
});


describe('swSource — chunk recovery (t_9cc3561f)', () => {
  it('listens for SKIP_WAITING messages from the page', () => {
    expect(SW_SOURCE).toContain("addEventListener('message'");
    expect(SW_SOURCE).toContain("SKIP_WAITING");
    expect(SW_SOURCE).toContain('skipWaiting()');
  });

  it('treats `_lc_chunk` navigations as network-only (no stale shell fallback)', () => {
    expect(SW_SOURCE).toContain("searchParams.has('_lc_chunk')");
    // Recovery path must not call navigationFallback — dying SW still controls the client.
    const idx = SW_SOURCE.indexOf("searchParams.has('_lc_chunk')");
    expect(idx).toBeGreaterThan(-1);
    const slice = SW_SOURCE.slice(idx, idx + 280);
    expect(slice).toContain('fetch(request)');
    expect(slice).not.toContain('navigationFallback');
  });

  it('serves network-only for a `_lc_chunk` document navigation even when a shell is cached', async () => {
    const { dispatchFetch, store } = runSwInSandbox({
      fetchImpl: () => Promise.resolve(mockResponse('<html>fresh</html>')),
    });
    store.set('https://www.lexiclash.live/en', mockResponse('<html>stale-shell</html>'));

    const req: MockRequest = {
      url: 'https://www.lexiclash.live/en?_lc_chunk=123',
      method: 'GET',
      mode: 'navigate',
      headers: { get: (k: string) => (k.toLowerCase() === 'accept' ? 'text/html' : null) },
    };
    const res = await dispatchFetch(req);
    expect(res._body).toBe('<html>fresh</html>');
  });
});
