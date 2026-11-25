#!/usr/bin/env node
// Repo-root entry so `npm run check` and `node scripts/verify-teacher-funnel.mjs` both work.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const feNext = join(dirname(fileURLToPath(import.meta.url)), '../fe-next');
const child = spawnSync(process.execPath, ['scripts/verify-teacher-funnel.mjs'], {
  cwd: feNext,
  stdio: 'inherit',
  env: process.env,
});
process.exit(child.status ?? 1);
