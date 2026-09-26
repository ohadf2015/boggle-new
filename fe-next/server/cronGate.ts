/**
 * Why this process must not start cron schedulers, or null when it may.
 *
 * Every Railway service in the production environment inherits the prod DB,
 * service key and Redis, so a QA preview deployed as its own service there runs
 * every prod job (emails, promotions) on whatever code it was built from. Only
 * the canonical service runs crons. DISABLE_CRONS=1 covers local QA servers.
 */
export function cronsDisabledReason(env: NodeJS.ProcessEnv): string | null {
  if (env.DISABLE_CRONS === '1') return 'DISABLE_CRONS=1';
  const service = env.RAILWAY_SERVICE_NAME;
  const canonical = env.CRON_SERVICE_NAME || 'boggle-new';
  if (service && service !== canonical) {
    return `Railway service "${service}" is not the cron service "${canonical}"`;
  }
  return null;
}
