/**
 * The Android app's WebView runs with LOAD_CACHE_ELSE_NETWORK (MainActivity, for the offline shell), which
 * serves ANY cached GET without asking the network, Supabase REST reads included. A teacher who created a
 * class then got the class list from before the class existed: "Classroom not found" (Nov 6, Supabase edge
 * logs show one classrooms GET all day from the app versus hundreds from browsers).
 *
 * `cache: 'no-store'` maps to Chromium's LOAD_DISABLE_CACHE, which the WebView cache mode does not strip,
 * so every read while online goes to the network. Offline, the request keeps its own cache setting, so a
 * cached read can still paint something.
 */
export function freshFetch(baseFetch?: typeof fetch): typeof fetch {
  // Read the global at call time, not import time, so a test or polyfill that swaps fetch later is used.
  return (input, init) => {
    const run = baseFetch ?? globalThis.fetch;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline) return run(input, init);
    return run(input, { ...init, cache: 'no-store' });
  };
}
