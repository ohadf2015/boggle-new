import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

export function posthogSourcemapCommand(env, distDir) {
  if (!env.POSTHOG_API_KEY) return null;
  const version = env.RAILWAY_GIT_COMMIT_SHA || env.SOURCE_COMMIT;
  return {
    args: [
      'sourcemap', 'process',
      '--directory', path.join(distDir, 'static', 'chunks'),
      '--release-name', 'lexiclash',
      ...(version ? ['--release-version', version] : []),
    ],
    env: {
      ...env,
      POSTHOG_CLI_API_KEY: env.POSTHOG_API_KEY,
      POSTHOG_CLI_PROJECT_ID: env.POSTHOG_PROJECT_ID,
      POSTHOG_CLI_HOST: env.POSTHOG_SOURCEMAP_HOST || 'https://eu.posthog.com',
    },
  };
}

function runCli(args, env) {
  const bin = createRequire(import.meta.url).resolve('@posthog/cli/run-posthog-cli.js');
  return spawnSync(process.execPath, [bin, ...args], { env, encoding: 'utf8' });
}

export async function uploadPosthogSourcemaps(distDir, { env = process.env, run = runCli, log = console } = {}) {
  const cmd = posthogSourcemapCommand(env, distDir);
  if (!cmd) return false;
  const res = run(cmd.args, cmd.env);
  if (res.status !== 0) {
    log.error(`[posthog] source map upload failed (exit ${res.status}): ${res.stderr || ''}${res.stdout || ''}${res.error || ''}`);
    return false;
  }
  log.info('[posthog] source maps uploaded');
  return true;
}
