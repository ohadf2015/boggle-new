import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment tag
  environment: process.env.NODE_ENV,

  // Capture 100% of errors
  sampleRate: 1.0,

  // 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Release tracking for source maps
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Disable Sentry replay - using LogRocket instead
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Integration with LogRocket - add session URL to errors
  beforeSend(event) {
    if (typeof window !== "undefined") {
      const LogRocket = (window as unknown as { LogRocket?: { sessionURL?: string } }).LogRocket;
      if (LogRocket?.sessionURL) {
        event.extra = event.extra || {};
        event.extra.logRocketSessionURL = LogRocket.sessionURL;
      }
    }
    return event;
  },

  // Filter out known non-actionable errors
  ignoreErrors: [
    // Browser extensions and resize observer
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors users can't control
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // User-initiated aborts
    "AbortError",
    // Script errors from third-party scripts
    "Script error",
  ],

  // Integrations
  integrations: [Sentry.browserTracingIntegration()],
});
