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
    // AdSense errors/warnings (external library)
    "no_div",
    /adsbygoogle/i,
    "AdSense head tag doesn't support data-nscript attribute",
    /adsense.*data-nscript/i,
    // Recharts library warning - non-actionable, occurs during initial render
    // before container dimensions stabilize. Chart renders correctly after delay.
    /width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/i,
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
