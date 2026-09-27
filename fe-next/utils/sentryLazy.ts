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
 * first-interaction window and every Lighthouse trace.)
 *
 * Importing `@/lib/sentry/clientInit` first guarantees `Sentry.init()` has run
 * (module-eval side effect) before any capture call resolves, so even the very
 * first error is not dropped.
 *
 * The init module lives in `lib/sentry/` — NOT at the project root — because
 * withSentryConfig auto-injects a root-level `sentry.client.config.ts` into
 * the `main-app` webpack entry (alongside instrumentation-client.ts), which
 * statically pulled the entire SDK back into every page's first-paint chunk
 * graph (Lighthouse chunk 78883: ~122KB transfer, 7.8s eval on mobile).
 */

type SentryModule = typeof import("@sentry/nextjs");

let sentryPromise: Promise<SentryModule> | null = null;
let resolvedModule: SentryModule | null = null;

export function loadSentry(): Promise<SentryModule> {
  if (!sentryPromise) {
    sentryPromise = (async () => {
      try {
        await import("@/lib/sentry/clientInit"); // side effect: Sentry.init()
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
