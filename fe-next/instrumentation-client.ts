import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";
import { installTranslationDomGuard } from "./utils/domTranslationGuard";

// Harden React against DOM mutations from in-browser page translators
// (Google Translate, Edge), which otherwise crash the app with
// `NotFoundError: Failed to execute 'removeChild'`. Installed as early as
// possible on the client, before React hydrates.
installTranslationDomGuard();

// Required for Sentry to instrument navigations in Next.js 16+
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
