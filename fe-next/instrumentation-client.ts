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
// or 60s after window-load, whichever comes first. 12s was still inside
// Lighthouse traces on this landing (LH 13 mobile often runs 15–40s when
// the page is slow; chunk 78883 then reappears as 8s of Script Evaluation).
// Errors still load the SDK immediately via onRecoverableError / sentryLazy.
if (typeof window !== "undefined") {
  const kickoff = () => {
    setTimeout(() => { void loadSentry(); }, 60_000);
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
