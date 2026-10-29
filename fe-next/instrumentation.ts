import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";
import { reportServerError } from "./lib/feedback/serverErrorReport";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Unhandled errors from Server Components, route handlers and middleware go to
// Sentry and, as auto-detected bugs, to our own feedback-devtools project.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  Sentry.captureRequestError(err, request, context);
  await reportServerError(err, { path: request.path, method: request.method }, context);
};
