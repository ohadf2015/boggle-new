import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment tag
  environment: process.env.NODE_ENV,

  // Performance monitoring sample rate
  tracesSampleRate: 0.1,

  // Release tracking
  release:
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    undefined,
});
