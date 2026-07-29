"use client";

import { useEffect } from "react";
import type { Language } from "@/types";

function isChunkLoadError(error: Error): boolean {
  const message = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";

  // Check for explicit chunk load error name
  if (name === "chunkloaderror") return true;

  // Check for specific chunk-related error messages
  // Note: 'failed to fetch' alone is too broad - only match if it's clearly a chunk/module error
  return (
    message.includes("loading chunk") ||
    message.includes("failed to load chunk") ||
    message.includes("loading css chunk") ||
    message.includes("dynamically imported module") ||
    message.includes("_next/static/chunks") ||
    // Only match 'failed to fetch' if it's in context of module/chunk loading
    (message.includes("failed to fetch") && (
      message.includes("module") ||
      message.includes("chunk") ||
      message.includes("_next/") ||
      message.includes("dynamically imported")
    ))
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Detect locale from URL path (e.g. /he/...) or fallback to 'en'
  const detectedLocale = (() => {
    try {
      const match = window.location.pathname.match(/^\/(he|en|sv|ja|es)\b/);
      return (match?.[1] as Language) || 'en';
    } catch {
      return 'en' as Language;
    }
  })();
  const isRTL = detectedLocale === 'he';

  useEffect(() => {
    // Auto-refresh on chunk load errors (stale deployment cache)
    if (isChunkLoadError(error)) {
      const hasRefreshed = sessionStorage.getItem("chunk_error_refresh");
      if (!hasRefreshed) {
        sessionStorage.setItem("chunk_error_refresh", "true");
        window.location.reload();
        return;
      }
      // Clear flag after showing error (so future errors can refresh again)
      sessionStorage.removeItem("chunk_error_refresh");
    }

    import("@/utils/sentry").then(({ captureError }) => {
      captureError(error, {
        errorBoundary: {
          type: "global-error",
          digest: error.digest,
          isChunkError: isChunkLoadError(error),
          locale: detectedLocale,
          path: (() => { try { return window.location.pathname; } catch { return undefined; } })(),
        },
      });
    });

    import("@/utils/crashlytics").then(({ recordNativeError }) => {
      void recordNativeError(error, {
        boundary: "global-error",
        digest: error.digest ?? "",
      });
    });
  }, [error, detectedLocale]);

  const t = (path: string): string => {
    const fallbacks: Record<string, Record<string, string>> = {
      en: {
        'errors.somethingWentWrong': 'Something Went Wrong',
        'errors.unexpectedError': 'An unexpected error occurred. Please try again.',
        'errors.refreshPage': 'Try Again',
        'errors.goHome': 'Go Home',
        'errors.globalErrorEncouragement': "Don't worry, these things happen!",
      },
      he: {
        'errors.somethingWentWrong': 'משהו השתבש',
        'errors.unexpectedError': 'אירעה שגיאה בלתי צפויה. אנא נסו שוב.',
        'errors.refreshPage': 'נסו שוב',
        'errors.goHome': 'חזרה הביתה',
        'errors.globalErrorEncouragement': 'אל דאגה, דברים כאלה קורים!',
      },
    };
    return fallbacks[detectedLocale]?.[path] || fallbacks.en[path] || path;
  };

  return (
    <html lang={detectedLocale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center p-6 bg-linear-to-br from-cyan-50 via-lime-50 to-cyan-100">
          <div className="max-w-xl w-full text-center p-8 neo-card bg-neo-cream text-neo-black rotate-[-1deg] animate-neo-pop">
            {/* Static emoji — this is the LAST-resort boundary; it must not depend
                on any lazy/icon chunk that could itself be stale during a chunk error. */}
            <div className="mb-6 animate-pulse flex justify-center" aria-hidden="true">
              <span className="text-6xl leading-none select-none">✨</span>
            </div>

            <h1 className="text-3xl font-black mb-4 uppercase tracking-wide text-neo-black font-neo-display">
              {t("errors.somethingWentWrong")}
            </h1>

            <p className="text-neo-gray text-lg mb-8 leading-relaxed">
              {t("errors.unexpectedError")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="btn-neo-primary px-6 py-3 text-lg"
                aria-label={t("errors.refreshPage")}
              >
                <span aria-hidden="true" className="me-1">🔄</span> {t("errors.refreshPage")}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="btn-neo-secondary px-6 py-3 text-lg"
              >
                🏠 {t("errors.goHome")}
              </button>
            </div>

            {/* Subtle encouragement */}
            <p className="text-neo-gray text-sm mt-6 opacity-75">
              {t("errors.globalErrorEncouragement")}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
