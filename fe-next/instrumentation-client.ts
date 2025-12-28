import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";

// Required for Sentry to instrument navigations in Next.js 16+
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
