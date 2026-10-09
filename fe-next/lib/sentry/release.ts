/**
 * Shared Sentry release id. Server/edge can read Railway/Vercel SHA at
 * runtime; the client bundle only inlines NEXT_PUBLIC_* so next.config.mjs
 * copies RAILWAY_GIT_COMMIT_SHA into NEXT_PUBLIC_SENTRY_RELEASE at build.
 */
export function sentryRelease(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value =
    env.SENTRY_RELEASE ||
    env.NEXT_PUBLIC_SENTRY_RELEASE ||
    env.RAILWAY_GIT_COMMIT_SHA ||
    env.VERCEL_GIT_COMMIT_SHA ||
    env.GITHUB_SHA ||
    undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
