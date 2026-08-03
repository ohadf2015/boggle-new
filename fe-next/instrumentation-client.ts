import { installTranslationDomGuard } from "./utils/domTranslationGuard";
import { loadSentry, getLoadedSentry } from "./utils/sentryLazy";

// Harden React against DOM mutations from in-browser page translators
// (Google Translate, Edge), which otherwise crash the app with
// `NotFoundError: Failed to execute 'removeChild'`. Installed as early as
// possible on the client, before React hydrates.
installTranslationDomGuard();

// Sentry is NOT statically imported here anymore — the SDK (~155KB min) used
// to ride along in the boot chunk and cost seconds of main-thread eval on
// mobile. It now loads after window-load + idle, or immediately on the first
// error/recoverable hydration error, whichever comes first.
if (typeof window !== "undefined") {
  const kickoff = () => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => { void loadSentry(); }, { timeout: 5000 });
    } else {
      setTimeout(() => { void loadSentry(); }, 3000);
    }
  };
  if (document.readyState === "complete") kickoff();
  else window.addEventListener("load", kickoff, { once: true });
}

// Required for Sentry to instrument navigations in Next.js 16+.
// Stays sync per the Next convention: a no-op until the SDK has loaded
// (navigation spans before idle-init are dropped — acceptable at
// tracesSampleRate 0.1; error capture is unaffected).
export function onRouterTransitionStart(
  href: string,
  navigationType: "push" | "replace" | "traverse"
) {
  getLoadedSentry()?.captureRouterTransitionStart(href, navigationType);
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
