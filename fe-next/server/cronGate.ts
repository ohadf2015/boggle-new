/**
 * Why this process must not start cron schedulers, or null when it may.
 *
 * Every Railway service in the production environment inherits the prod DB,
 * service key and Redis, so a QA preview deployed as its own service there runs
 * every prod job (emails, promotions) on whatever code it was built from. Only
 * the canonical service runs crons. DISABLE_CRONS=1 covers local QA servers.
 *
 * WEB_CRONS (default unset = crons run in the web process, as in production).
 * To move them to a worker service: WEB_CRONS=0 on the web service plus
 * CRON_SERVICE_NAME=<worker service> on the worker. WEB_CRONS=0 with no worker
 * means NO crons run anywhere; verify by the startup log, which says either
 * "Started cron schedulers" or "Cron schedulers disabled (WEB_CRONS=0)".
 */
export function cronsDisabledReason(env: NodeJS.ProcessEnv): string | null {
  if (env.DISABLE_CRONS === '1') return 'DISABLE_CRONS=1';
  if (env.WEB_CRONS === '0') return 'WEB_CRONS=0';
  const service = env.RAILWAY_SERVICE_NAME;
  const canonical = env.CRON_SERVICE_NAME || 'boggle-new';
  if (service && service !== canonical) {
    return `Railway service "${service}" is not the cron service "${canonical}"`;
  }
  return null;
}
