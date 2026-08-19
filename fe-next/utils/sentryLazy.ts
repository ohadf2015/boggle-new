/**
 * Lazy loader for the Sentry browser SDK.
 *
 * Why this exists: ~155KB (min) of @sentry/nextjs was statically pinned into
 * the client boot chunk (Lighthouse chunk 32162: 9.1s scripting under 4x CPU
 * throttle, the single biggest main-thread cost on the landing page). Every
 * boot-path consumer (logger, consoleOverride, ServiceWorkerRegistration,
 * CoinContext, instrumentation-client) now goes through this dynamic import so
 * the SDK splits into a lazy chunk — fetched on first error, or ~12s after
 * window-load, whichever comes first. (An earlier window-load+idle trigger
 * still landed the SDK's ~490KB fetch and its multi-second init burst inside
 * the first-interaction window and every Lighthouse trace.)
 *
 * Importing `@/sentry.client.config` first guarantees `Sentry.init()` has run
 * (module-eval side effect) before any capture call resolves, so even the very
 * first error is not dropped.
 */

type SentryModule = typeof import("@sentry/nextjs");

let sentryPromise: Promise<SentryModule> | null = null;
let resolvedModule: SentryModule | null = null;

export function loadSentry(): Promise<SentryModule> {
  if (!sentryPromise) {
    sentryPromise = (async () => {
      try {
        await import("@/sentry.client.config"); // side effect: Sentry.init()
      } catch (err) {
        // Init failure (or a partial test mock) must never break the app —
        // telemetry is best-effort; captures still flow once the SDK module
        // resolves below.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[sentryLazy] Sentry init failed:", err);
        }
      }
      const S = await import("@sentry/nextjs");
      resolvedModule = S;
      return S;
    })();
  }
  return sentryPromise;
}

/** Peek without triggering a load — for hot paths that must stay sync. */
export function getLoadedSentry(): SentryModule | null {
  return resolvedModule;
}
