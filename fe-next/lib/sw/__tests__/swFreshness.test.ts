import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { SW_SOURCE, SW_CACHE_NAME } from '../swSource';

const ORIGIN = 'https://www.lexiclash.live';
const OLD_CACHE = 'lexiclash-v9-20261116000000';

interface FakeResponse {
  status: number;
  type: string;
  body: string;
  clone(): FakeResponse;
}

function res(body: string, status = 200): FakeResponse {
  return { status, type: 'basic', body, clone: () => res(body, status) };
}

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
  headers: { get(k: string): string | null };
}

function req(path: string, opts: { mode?: string; headers?: Record<string, string> } = {}): FakeRequest {
  const headers = Object.fromEntries(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    url: ORIGIN + path,
    method: 'GET',
    mode: opts.mode ?? 'cors',
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  };
}

function navReq(path: string): FakeRequest {
  return req(path, { mode: 'navigate', headers: { accept: 'text/html' } });
}

/** Runs the real SW script against named caches, so tests can seed a previous build's cache. */
function boot(network: (r: FakeRequest | string) => Promise<FakeResponse>) {
  const stores = new Map<string, Map<string, FakeResponse>>();
  const keyOf = (r: FakeRequest | string) => {
    const url = typeof r === 'string' ? r : r.url;
    return url.startsWith('/') ? ORIGIN + url : url;
  };
  const cacheFor = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (r: FakeRequest | string) => store.get(keyOf(r)),
      put: async (r: FakeRequest | string, response: FakeResponse) => {
        store.set(keyOf(r), response);
      },
      addAll: async () => undefined,
      keys: async () => [],
    };
  };
  const caches = {
    open: async (name: string) => cacheFor(name),
    match: async (r: FakeRequest | string) => {
      for (const store of stores.values()) {
        const hit = store.get(keyOf(r));
        if (hit) return hit;
      }
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const handlers: Record<string, (e: unknown) => void> = {};
  const context = {
    self: {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        handlers[type] = fn;
      },
      skipWaiting: () => undefined,
      clients: { claim: async () => undefined, matchAll: async () => [] },
      location: { origin: ORIGIN },
    },
    caches,
    fetch: network,
    URL,
    Response: { error: () => res('', 0) },
    console,
  };
  vm.createContext(context);
  new vm.Script(SW_SOURCE).runInContext(context);

  const seed = (cacheName: string, path: string, body: string) =>
    cacheFor(cacheName).put(ORIGIN + path, res(body));
  const dispatch = async (r: FakeRequest): Promise<FakeResponse | undefined> => {
    let responded: Promise<FakeResponse> | undefined;
    handlers.fetch({ request: r, respondWith: (p: Promise<FakeResponse>) => (responded = p) });
    return responded;
  };
  return { seed, dispatch };
}

const online = (body: string) => async () => res(body);
const offline = async () => {
  throw new Error('offline');
};

describe('service worker never serves stale RSC or code while online', () => {
  it('serves a client-navigation RSC payload (?_rsc=) from the network over a cached copy', async () => {
    const sw = boot(online('rsc-new-build'));
    await sw.seed(SW_CACHE_NAME, '/en/daily?_rsc=abc', 'rsc-old-build');
    const out = await sw.dispatch(req('/en/daily?_rsc=abc', { headers: { RSC: '1' } }));
    expect(out?.body).toBe('rsc-new-build');
  });

  it('treats a request with only the RSC: 1 header as RSC too', async () => {
    const sw = boot(online('rsc-new-build'));
    await sw.seed(SW_CACHE_NAME, '/en/daily', 'rsc-old-build');
    const out = await sw.dispatch(req('/en/daily', { headers: { RSC: '1' } }));
    expect(out?.body).toBe('rsc-new-build');
  });

  it('falls back to the cached RSC payload when the network is down', async () => {
    const sw = boot(offline);
    await sw.seed(SW_CACHE_NAME, '/en/daily?_rsc=abc', 'rsc-cached');
    const out = await sw.dispatch(req('/en/daily?_rsc=abc', { headers: { RSC: '1' } }));
    expect(out?.body).toBe('rsc-cached');
  });

  it('never answers from a previous build cache that survived activation', async () => {
    const sw = boot(online('chunk-from-network'));
    await sw.seed(OLD_CACHE, '/_next/static/chunks/app/page-aaa.js', 'chunk-old-build');
    const out = await sw.dispatch(req('/_next/static/chunks/app/page-aaa.js'));
    expect(out?.body).toBe('chunk-from-network');
  });

  it('ignores a previous build copy of a stale-while-revalidate asset', async () => {
    const sw = boot(online('manifest-new'));
    await sw.seed(OLD_CACHE, '/manifest.webmanifest', 'manifest-old');
    const out = await sw.dispatch(req('/manifest.webmanifest'));
    expect(out?.body).toBe('manifest-new');
  });

  it('still serves this build cached chunk without a network trip', async () => {
    let calls = 0;
    const sw = boot(async () => {
      calls += 1;
      return res('network');
    });
    await sw.seed(SW_CACHE_NAME, '/_next/static/chunks/app/page-bbb.js', 'chunk-cached');
    const out = await sw.dispatch(req('/_next/static/chunks/app/page-bbb.js'));
    expect(out?.body).toBe('chunk-cached');
    expect(calls).toBe(0);
  });
});

describe('service worker offline support stays intact', () => {
  it('serves fresh HTML for a navigation while online', async () => {
    const sw = boot(online('<html>new</html>'));
    await sw.seed(SW_CACHE_NAME, '/en/connections/daily', '<html>old</html>');
    const out = await sw.dispatch(navReq('/en/connections/daily'));
    expect(out?.body).toBe('<html>new</html>');
  });

  it('falls back to the locale home shell for an offline navigation', async () => {
    const sw = boot(offline);
    await sw.seed(SW_CACHE_NAME, '/en', '<html>en-shell</html>');
    const out = await sw.dispatch(navReq('/en/never-visited'));
    expect(out?.body).toBe('<html>en-shell</html>');
  });

  it('keeps the dictionary offline-first', async () => {
    const sw = boot(offline);
    await sw.seed(SW_CACHE_NAME, '/api/dictionary-words?lang=en', 'apple');
    const out = await sw.dispatch(req('/api/dictionary-words?lang=en'));
    expect(out?.body).toBe('apple');
  });
});
