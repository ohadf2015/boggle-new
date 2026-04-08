import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

const isProduction = process.env.NODE_ENV === "production";
const environment = process.env.NODE_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: isProduction,
  environment,

  tracesSampleRate: isProduction ? 0.1 : 1.0,

  release:
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    undefined,

  beforeSend(event) {
    const error = event.exception?.values?.[0];
    if (error?.value) {
      const errorMessage = error.value.toLowerCase();

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("aborted")
      ) {
        return null;
      }
    }

    return event;
  },

  ignoreErrors: [
    "AbortError",
    "TimeoutError",
    "ECONNRESET",
    "ETIMEDOUT",
    // Bots hitting routes with invalid locale params — not a bug
    /Incorrect locale information provided/i,
  ],

  initialScope: {
    tags: {
      runtime: "edge",
    },
  },
});
