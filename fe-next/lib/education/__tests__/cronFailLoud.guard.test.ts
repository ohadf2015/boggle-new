import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const CRON_DIR = path.join(__dirname, '../../../app/api/cron');
const routes = readdirSync(CRON_DIR)
  .map((d) => path.join(CRON_DIR, d, 'route.ts'))
  .filter((p) => existsSync(p));

describe('cron routes never report a missing database client as success', () => {
  it.each(routes.map((r) => [path.basename(path.dirname(r)), r]))('%s', (_name, file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/reason: 'no-supabase-admin'/);
  });
});
