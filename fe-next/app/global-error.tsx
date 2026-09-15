"use client";

import { useEffect } from "react";
import type { Language } from "@/types";
import {
  isChunkLoadError as isChunkLoadErrorNameMessage,
  clearCachesAndReload,
  claimChunkRecoveryGuard,
  clearChunkRecoveryGuard,
} from "@/lib/deploy/staleDeployReload";

function isChunkLoadError(error: Error): boolean {
  return isChunkLoadErrorNameMessage(error.name, error.message);
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
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    // Fire telemetry BEFORE any reload so the event has a chance to flush
    // (a reload mid-capture drops it — keeping us blind to recurrence).
    import("@/utils/sentry").then(({ captureError }) => {
      captureError(error, {
        errorBoundary: {
          type: "global-error",
          digest: error.digest,
          isChunkError: chunkError,
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

    // Auto-refresh on chunk load errors — must use cache-bust + SW purge, not
    // bare reload (that re-served offline-shell SWR HTML; t_9cc3561f).
    if (chunkError) {
      if (claimChunkRecoveryGuard()) {
        void clearCachesAndReload();
        return;
      }
      // Already tried once — clear so a later session can recover again.
      clearChunkRecoveryGuard();
    }
  }, [error, detectedLocale, chunkError]);

  const t = (path: string): string => {
    const fallbacks: Record<string, Record<string, string>> = {
      en: {
        'errors.somethingWentWrong': 'Something Went Wrong',
        'errors.unexpectedError': 'An unexpected error occurred. Please try again.',
        'errors.refreshPage': 'Try Again',
        'errors.goHome': 'Go Home',
        'errors.globalErrorEncouragement': "Don't worry, these things happen!",
        'errors.updateHeading': 'Fresh Update Ready!',
        'errors.updateMessage': "Cool new stuff just dropped! Quick refresh and you're back in.",
      },
      he: {
        'errors.somethingWentWrong': 'משהו השתבש',
        'errors.unexpectedError': 'אירעה שגיאה בלתי צפויה. אנא נסו שוב.',
        'errors.refreshPage': 'נסו שוב',
        'errors.goHome': 'חזרה הביתה',
        'errors.globalErrorEncouragement': 'אל דאגה, דברים כאלה קורים!',
        'errors.updateHeading': 'עדכון חדש מוכן!',
        'errors.updateMessage': 'יש לנו עדכון חדש! רענון קצר וממשיכים.',
      },
    };
    return fallbacks[detectedLocale]?.[path] || fallbacks.en[path] || path;
  };

  const handleRetry = () => {
    if (chunkError) {
      clearChunkRecoveryGuard();
      void clearCachesAndReload();
      return;
    }
    reset();
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
              {chunkError ? t("errors.updateHeading") : t("errors.somethingWentWrong")}
            </h1>

            <p className="text-neo-gray text-lg mb-8 leading-relaxed">
              {chunkError ? t("errors.updateMessage") : t("errors.unexpectedError")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="btn-neo-primary px-6 py-3 text-lg"
                aria-label={t("errors.refreshPage")}
              >
                <span aria-hidden="true" className="me-1">🔄</span> {t("errors.refreshPage")}
              </button>
              <button
                type="button"
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
