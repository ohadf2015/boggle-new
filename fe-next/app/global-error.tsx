"use client";

import { useEffect } from "react";
import { captureError } from "@/utils/sentry";
import { translations } from "../translations";

function isChunkLoadError(error: Error): boolean {
  const message = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";
  return (
    name === "chunkloaderror" ||
    message.includes("loading chunk") ||
    message.includes("failed to load chunk") ||
    message.includes("loading css chunk") ||
    message.includes("dynamically imported module")
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
        <div className="min-h-screen flex items-center justify-center p-6 bg-neo-navy text-neo-white">
          <div className="max-w-xl w-full text-center p-6 neo-card bg-neo-cream text-neo-black rotate-[-1deg]">
            <div className="text-5xl mb-4">😵</div>
            <h1 className="text-2xl font-black mb-3 uppercase tracking-wide text-neo-red">
              {t("errors.somethingWentWrong")}
            </h1>
            <p className="text-sm mb-4">{t("errors.unexpectedError")}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="btn-neo-primary px-6 py-3"
                aria-label={t("errors.refreshPage")}
              >
                {t("errors.refreshPage")}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="btn-neo-secondary px-6 py-3"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
