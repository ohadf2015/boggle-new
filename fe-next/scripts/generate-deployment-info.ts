/**
 * Build-time changelog capture for the admin "Deployment" panel.
 *
 * Runs during `npm run build`. Reads the last N commits via `git log` and writes
 * `lib/admin/deploymentChangelog.generated.json`, which the admin API imports.
 *
 * CRITICAL: this only writes when git actually returns commits. Inside Railway's
 * Docker build the repo `.git` is excluded (`.dockerignore`), so `git log` yields
 * nothing there — in that case we LEAVE the committed file untouched so the
 * history captured at the last local build survives into the image. The live
 * "latest deploy" headline is sourced separately from Railway env vars at runtime.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GIT_LOG_FORMAT, parseGitLog } from '../lib/admin/deploymentInfo';

const COMMIT_COUNT = 20;
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'lib', 'admin', 'deploymentChangelog.generated.json');

function main(): void {
  let raw: string;
  try {
    raw = execFileSync(
      'git',
      ['log', `-n`, String(COMMIT_COUNT), '--no-color', `--pretty=format:${GIT_LOG_FORMAT}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch (err) {
    console.log(
      `[deployment-info] git unavailable — keeping existing changelog file. (${(err as Error).message})`,
    );
    return;
  }

  const commits = parseGitLog(raw);
  if (commits.length === 0) {
    console.log('[deployment-info] git log returned no commits — keeping existing changelog file.');
    return;
  }

  const payload = { generatedAt: new Date().toISOString(), commits };
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[deployment-info] wrote ${commits.length} commits → deploymentChangelog.generated.json`);
}

main();
