/**
 * Runtime build identity for deploy-confirmation health checks.
 * Railway injects RAILWAY_GIT_COMMIT_SHA at runtime; other hosts use
 * SOURCE_COMMIT / GIT_COMMIT / Vercel. Fall back to "unknown" rather
 * than inventing a sha — unknown is itself a signal that env is missing.
 */

export const PROCESS_STARTED_AT = new Date().toISOString();

const SHA_ENV_KEYS = [
  'RAILWAY_GIT_COMMIT_SHA',
  'SOURCE_COMMIT',
  'GIT_COMMIT',
  'VERCEL_GIT_COMMIT_SHA',
  'COMMIT_SHA',
  'NEXT_PUBLIC_GIT_SHA',
] as const;

export function runningCommitSha(): string {
  for (const key of SHA_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return 'unknown';
}

export function deployHealthPayload(): {
  status: 'ok';
  commit: string;
  started_at: string;
  service: 'lexiclash';
} {
  return {
    status: 'ok',
    commit: runningCommitSha(),
    started_at: PROCESS_STARTED_AT,
    service: 'lexiclash',
  };
}

export const DEPLOY_HEALTH_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;
