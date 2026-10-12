// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// GET handlers that write (rows, coins, external sessions) must keep the remote, revocation-aware check.
const WRITING_GETS = [
  'engagement/calendar',
  'growth/referral',
  'word-mastery',
  'word-tower/wreck',
  'word-tower/estate',
  'word-tower/estate/rivals',
  'education/challenges/daily',
  'education/challenges/weekly',
  'subscription/status',
];

const API = join(__dirname, '..', '..', '..', 'app', 'api');

function getHandlerSource(route: string): string {
  const src = readFileSync(join(API, route, 'route.ts'), 'utf8');
  const start = src.search(/export (async )?function GET\b/);
  expect(start, `${route} exports GET`).toBeGreaterThanOrEqual(0);
  const next = src.slice(start + 1).search(/\nexport /);
  return next < 0 ? src.slice(start) : src.slice(start, start + 1 + next);
}

describe('GET handlers that write keep remote session verification', () => {
  it.each(WRITING_GETS)('%s passes { writes: true } to getAuthedUser', (route) => {
    const handler = getHandlerSource(route);
    const calls = handler.match(/getAuthedUser\([^)]*\)/g) ?? [];
    expect(calls.length, `${route} GET calls getAuthedUser`).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/writes:\s*true/);
  });
});
