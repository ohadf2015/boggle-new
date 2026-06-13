/**
 * lazyPosthog — a drop-in proxy for the `posthog-js` default export that NEVER
 * statically imports the library.
 *
 * WHY: posthog-js (~374KB / ~110KB gzipped) was hoisted by Turbopack into the
 * always-loaded shared-commons chunk because ~23 modules did
 * `import posthog from 'posthog-js'`. That chunk ships on EVERY route — even
 * feature-less `/blog/*` pages with no analytics needs — inflating the eager
 * parse path that gates a hydration-bound LCP. A shared-commons chunk dissolves
 * only when ZERO files statically import the lib, so every call site imports
 * THIS module instead. posthog-js is then dynamic-`import()`ed exactly once, on
 * the first `init()` (the existing PostHogProvider mount effect), as its own
 * async chunk that is no longer in any route's first-load set.
 *
 * Fire-and-forget calls (capture/identify/register/people.*) made before the
 * lib finishes loading are buffered and flushed — in original order, AFTER
 * `init()` — so pre-consent events still hit an `opt_out_capturing_by_default`
 * instance and are dropped exactly as before. Synchronous reads
 * (getFeatureFlag) return undefined until load; callers (usePostHogFlag)
 * already treat that as "fall back to default", so flags simply resolve a beat
 * later instead of never.
 */

import type { PostHog } from 'posthog-js';

type AnyArgs = unknown[];
interface QueuedCall {
  path: string[];
  args: AnyArgs;
}

let real: PostHog | null = null;
let loadPromise: Promise<PostHog | null> | null = null;
const callQueue: QueuedCall[] = [];
const flagCallbacks: Array<(...a: AnyArgs) => void> = [];

// Bound so a never-initialized posthog (no key / SSR) can't leak memory if a
// hot path keeps firing events. Oldest dropped first; analytics is best-effort.
const MAX_QUEUE = 200;

function enqueue(path: string[], args: AnyArgs): void {
  if (callQueue.length >= MAX_QUEUE) callQueue.shift();
  callQueue.push({ path, args });
}

/** Walk `path` (e.g. ['people','set']) on `target` and invoke the leaf fn. */
function applyPath(target: unknown, path: string[], args: AnyArgs): void {
  let obj = target as Record<string, unknown> | undefined;
  for (let i = 0; i < path.length - 1; i++) {
    obj = obj?.[path[i]] as Record<string, unknown> | undefined;
  }
  const fn = obj?.[path[path.length - 1]];
  if (typeof fn === 'function') (fn as (...a: AnyArgs) => unknown).apply(obj, args);
}

/** Fire-and-forget proxy method: forward when loaded, buffer otherwise. */
function ff(path: string[]) {
  return (...args: AnyArgs): void => {
    if (real) applyPath(real, path, args);
    else enqueue(path, args);
  };
}

/**
 * Trigger the one-time dynamic import + init of posthog-js. Idempotent:
 * concurrent or repeat callers share the single in-flight promise, so
 * posthog-js loads and inits exactly once.
 */
export function initLazyPostHog(
  key: string,
  options: Record<string, unknown> = {},
): Promise<PostHog | null> {
  if (loadPromise) return loadPromise;
  loadPromise = import('posthog-js')
    .then(({ default: ph }) => {
      // init FIRST so buffered captures flush into a configured (and, by
      // default, opted-out) instance — preserving the GDPR drop semantics.
      ph.init(key, options as Parameters<PostHog['init']>[1]);
      real = ph;

      for (const c of callQueue) applyPath(ph, c.path, c.args);
      callQueue.length = 0;

      for (const cb of flagCallbacks) ph.onFeatureFlags(cb);
      flagCallbacks.length = 0;

      return ph;
    })
    .catch(() => null);
  return loadPromise;
}

/** @internal test-only reset of module state. */
export function _resetLazyPostHog(): void {
  real = null;
  loadPromise = null;
  callQueue.length = 0;
  flagCallbacks.length = 0;
}

const lazyPosthog = {
  /** Triggers the lazy load + init. Mirrors posthog.init(key, options). */
  init: (key: string, options: Record<string, unknown> = {}): void => {
    void initLazyPostHog(key, options);
  },

  capture: ff(['capture']),
  identify: ff(['identify']),
  reset: ff(['reset']),
  register: ff(['register']),
  register_once: ff(['register_once']),
  opt_in_capturing: ff(['opt_in_capturing']),
  opt_out_capturing: ff(['opt_out_capturing']),

  people: {
    set: ff(['people', 'set']),
    set_once: ff(['people', 'set_once']),
  },

  /** Before load: report "opted out" so callers never assume consent. */
  has_opted_out_capturing: (): boolean =>
    real ? real.has_opted_out_capturing() : true,

  /** Before load: undefined → callers fall back to their default variant. */
  getFeatureFlag: (key: string): string | boolean | undefined =>
    real ? real.getFeatureFlag(key) : undefined,

  /** Before load: queue the callback; it is wired once posthog-js is ready. */
  onFeatureFlags: (cb: (...a: AnyArgs) => void): void => {
    if (real) real.onFeatureFlags(cb);
    else flagCallbacks.push(cb);
  },
};

export default lazyPosthog;
