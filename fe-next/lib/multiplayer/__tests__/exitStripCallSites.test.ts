import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `stripMultiplayerExitParams` removes room + classroom + host together,
 * because leaving `classroom=true&host=true` behind re-runs the classroom HOST
 * boot path on the next render — which creates a brand new room.
 *
 * The multiplayer page had three exit paths and only one of them used it. The
 * other two hand-rolled `searchParams.delete('room')`, so a classroom teacher
 * who left a room (or whose room died) landed back on
 * `?classroom=true&host=true` and silently got another room. A LogRocket replay
 * (2026-08-30) shows one teacher produce four rooms in 37 minutes with zero
 * students, and the nav trail contains exactly that URL shape:
 *
 *   /multiplayer?room=FQHSQ8&classroom=true&host=true
 *   /multiplayer?classroom=true&host=true      <- room dropped, host kept
 *
 * This is the repo's Class 3 pattern: two routes to the same outcome, one of
 * them silently divergent. Guard the call sites, since the pure function's own
 * tests pass either way.
 */
const PAGE = join(
  __dirname,
  '..',
  '..',
  '..',
  'app',
  '[locale]',
  'multiplayer',
  'PageClient.tsx'
);

describe('multiplayer exit paths all use the shared param strip', () => {
  const source = readFileSync(PAGE, 'utf8');

  it('never hand-rolls a room-only delete', () => {
    const offenders = source
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /searchParams\.delete\(\s*['"]room['"]\s*\)/.test(line))
      .map(({ line, n }) => `  PageClient.tsx:${n}  ${line}`);

    expect(
      offenders.join('\n') || null,
      'Deleting only `room` leaves `classroom=true&host=true`, which re-enters the classroom host boot path and creates another room. Use stripMultiplayerExitParams(window.location.href).'
    ).toBeNull();
  });

  it('imports and uses the shared helper', () => {
    expect(source).toContain('stripMultiplayerExitParams');
    // One import + one call per exit path that clears the URL.
    const uses = source.match(/stripMultiplayerExitParams\(/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
  });
});
