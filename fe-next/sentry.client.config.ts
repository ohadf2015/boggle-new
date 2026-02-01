import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const isProduction = process.env.NODE_ENV === "production";
const environment = process.env.NODE_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: isProduction,
  environment,

  sampleRate: 1.0,
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend(event, hint) {
    if (typeof window !== "undefined") {
      const LogRocket = (window as unknown as { LogRocket?: { sessionURL?: string } }).LogRocket;
      if (LogRocket?.sessionURL) {
        event.extra = event.extra || {};
        event.extra.logRocketSessionURL = LogRocket.sessionURL;
      }
    }

    // Filter out non-critical analytics API errors
    // These are already handled gracefully with timeouts and error catching
    const requestUrl = event.request?.url || event.contexts?.trace?.data?.url;
    if (requestUrl && typeof requestUrl === 'string' && requestUrl.includes('/api/analytics/guest-session')) {
      return null;
    }

    const error = hint.originalException;
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("non-error promise rejection captured") ||
        errorMessage.includes("chunk load failed") ||
        errorMessage.includes("loading chunk") ||
        errorMessage.includes("loading css chunk")
      ) {
        return null;
      }
    }

    return event;
  },

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Failed to fetch",
    "NetworkError",
    "Network request failed",
    "Load failed",
    "AbortError",
    "Aborted",
    "Script error",
    "Non-Error promise rejection captured",
    "ChunkLoadError",
    "Loading chunk",
    "Loading CSS chunk",
    "Failed to load chunk",
    "dynamically imported module",
    /from module \d+/i,
    /^Uncaught \(in promise\)/,
    /^Unhandled \(rejection\)/,
    // Howler.js audio pool exhaustion - expected on mobile devices with many sounds
    // Fixed by increasing pool size in howlerConfig.ts, but can still occur on low-memory devices
    "HTML5 Audio pool exhausted",
    /html5 audio pool exhausted/i,
    /pool exhausted.*returning potentially locked audio/i,
    // AdSense errors/warnings (external library)
    "no_div",
    /adsbygoogle/i,
    "AdSense head tag doesn't support data-nscript attribute",
    /adsense.*data-nscript/i,
    // Recharts library warning - non-actionable, occurs during initial render
    // before container dimensions stabilize. Chart renders correctly after delay.
    /width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/i,
    // Auth session timeout warning - expected behavior on slow mobile connections
    // The app continues without blocking, handles gracefully with 5s timeout
    "Auth session fetch timed out",
    /auth session fetch timed out/i,
    // Socket.IO connection warnings - transient network errors with auto-retry
    "[SOCKET.IO] Connection error",
    /\[socket\.io\].*connection error/i,
    // WebSocket/Socket.IO connection closed - transient network errors
    // These are expected when users close tabs, lose network, or switch pages
    "Connection closed",
    /connection closed/i,
    // Avatar color validation error - client sends invalid hex, server rejects (expected)
    "avatar.color: Invalid string",
    /avatar\.color.*must match pattern/i,
    // Word Hunt storage validation - skipping corrupt localStorage data (expected filtering)
    "[Storage] Skipping invalid result",
    /\[storage\].*skipping invalid.*attemptsUsed.*0/i,
    "[Storage] Invalid attemptsUsed",
    /\[storage\].*invalid attemptsUsed/i,
    // Room name validation - server correctly rejects invalid characters
    "roomName: Room name can only contain",
    /roomName.*can only contain/i,
    // Auth context errors - should not occur with proper provider setup (historical)
    "useAuth must be used within an AuthProvider",
    /useAuth must be used within.*provider/i,
    // AI hint generation failures - handled gracefully with fallback hints
    // These occur when Vertex AI returns error pages or rate limits
    "[API] AI hint generation failed",
    /\[api\].*ai hint generation failed/i,
    /unexpected token.*<!doctype/i,
    // Remotion license notification - informational only, not an error
    // Shows for open-source usage of Remotion Player component
    /remotion.*license/i,
    /acknowledgeRemotionLicense/i,
    // DDA Analytics timeouts - non-blocking, handled gracefully with fallback
    // Analytics failures don't affect gameplay (see lib/aiDirector/analyticsLogger.ts:109)
    /\[DDA Analytics\].*failed to log event/i,
    /\[DDA Analytics\].*408/i,
    // Notifications subscription timeouts - handled with automatic retry
    // See lib/supabaseRealtimeNotifications.ts:89 for retry logic
    /notifications channel subscription timed out/i,
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /webkit-masked-url/i,
    /^resource:\/\//i,
    // Ignore AdSense errors (external)
    /pagead.*googlesyndication\.com/i,
  ],

  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true,
      enableLongTask: true,
    }),
  ],

  initialScope: {
    tags: {
      runtime: "browser",
    },
  },
});
