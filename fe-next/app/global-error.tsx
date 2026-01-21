"use client";

import { useEffect } from "react";
import { captureError } from "@/utils/sentry";
import { translations } from "../translations";

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

    captureError(error, {
      errorBoundary: {
        type: "global-error",
        digest: error.digest,
      },
    });
  }, [error]);

  // Use English as fallback for global errors
  const t = (path: string): string => {
    try {
      const keys = path.split(".");
      let current: unknown = translations.en;
      for (const key of keys) {
        current = (current as Record<string, unknown>)[key];
        if (current === undefined) return path;
      }
      return current as string;
    } catch {
      return path;
    }
  };

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-cyan-50 via-lime-50 to-cyan-100">
          <div className="max-w-xl w-full text-center p-8 neo-card bg-neo-cream text-neo-black rotate-[-1deg] animate-neo-pop">
            {/* Floating icon with gentle animation */}
            <div className="text-7xl mb-6 animate-pulse">🌟</div>

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
                🔄 {t("errors.refreshPage")}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="btn-neo-secondary px-6 py-3 text-lg"
              >
                🏠 Go Home
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
