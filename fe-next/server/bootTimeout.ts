/**
 * Boot-time aggregate timeout guard.
 *
 * Wraps a startup task (e.g. initializeServer) with a hard ceiling. On timeout —
 * OR if the task rejects — the returned promise RESOLVES (it never rejects) so
 * the caller proceeds to bind the port in degraded mode. This guarantees a
 * single hung dependency (Redis restore, dictionary load, worker-pool init) can
 * never cause an infinite never-listen crash-loop where Railway's healthcheck
 * fails forever → container killed → restarted → hangs again.
 *
 * ponytail: aggregate ceiling only — individual steps keep their own finer
 * timeouts/try-catch (see lifecycle.ts; Redis adapter already self-bounds at
 * 15s). Keep the ceiling comfortably UNDER Railway's healthcheckTimeout so the
 * port binds inside the healthcheck window; raise SERVER_INIT_TIMEOUT_MS only if
 * a cold dictionary load legitimately needs longer AND Railway's
 * healthcheckTimeout is raised to match.
 *
 * @returns true if the task timed out (booting degraded), false if it completed.
 */
import { lifecycleLogger } from './logger';

interface BootLogger {
  error: (obj: object, msg: string) => void;
}

export function withBootTimeout(
  label: string,
  task: Promise<unknown>,
  timeoutMs: number,
  log: BootLogger = lifecycleLogger,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;

  const completed = task.then(
    () => false,
    (err: unknown) => {
      log.error({ label, err }, `${label} failed during boot — continuing in degraded mode`);
      return false;
    },
  );

  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => {
      log.error(
        { label, timeoutMs },
        `${label} exceeded ${timeoutMs}ms — binding port in degraded mode so the liveness probe can answer`,
      );
      resolve(true);
    }, timeoutMs);
  });

  return Promise.race([completed, timedOut]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
