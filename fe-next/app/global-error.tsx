"use client";

import { useEffect } from "react";
import { captureError } from "@/utils/sentry";
import { translations } from "../translations";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
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
