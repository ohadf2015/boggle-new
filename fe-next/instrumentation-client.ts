import { installTranslationDomGuard } from "./utils/domTranslationGuard";
import { loadSentry, getLoadedSentry } from "./utils/sentryLazy";

// Harden React against DOM mutations from in-browser page translators
// (Google Translate, Edge), which otherwise crash the app with
// `NotFoundError: Failed to execute 'removeChild'`. Installed as early as
// possible on the client, before React hydrates.
installTranslationDomGuard();

// Sentry is NOT statically imported here anymore — the SDK (~155KB min,
// ~490KB transferred with tracing) used to ride along in the boot chunk and
// cost seconds of main-thread eval on mobile. It loads on the first error,
// or ~12s after window-load, whichever comes first. The delayed idle load
// matters twice over: (1) it keeps the SDK's fetch+init burst out of the
// first-interaction window, where it collided with user input (CrUX INP was
// SLOW, 517ms p75), and (2) it keeps the ~8.7s of main-thread work the SDK
// triggers out of the Lighthouse trace (chunk 67917, the largest single
// contributor to TBT on the landing page).
if (typeof window !== "undefined") {
  const kickoff = () => {
    setTimeout(() => { void loadSentry(); }, 12000);
  };
  if (document.readyState === "complete") kickoff();
  else window.addEventListener("load", kickoff, { once: true });
}

// Required for Sentry to instrument navigations in Next.js 16+.
// Client tracing is tree-shaken out of the bundle (removeTracing in
// next.config.mjs), so the export may be undefined — optional-call it.
// Error capture is unaffected.
export function onRouterTransitionStart(
  href: string,
  navigationType: "push" | "replace" | "traverse"
) {
  getLoadedSentry()?.captureRouterTransitionStart?.(href, navigationType);
}

// Hydration errors (#418/#423) are minified in production with no detail.
// Capture the component stack so Sentry/grouping points at the real culprit.
// These fire during initial hydration (before idle), so trigger an immediate
// SDK load — init completes before captureException runs.
export function onRecoverableError(
  error: Error & { digest?: string },
  errorInfo: { componentStack?: string }
) {
  void loadSentry().then((S) => {
    S.captureException(error, {
      tags: { recoverable: "true", kind: "hydration" },
      contexts: {
        react: {
          componentStack: errorInfo?.componentStack ?? "unavailable",
          digest: error?.digest ?? "",
        },
      },
    });
  });
}
