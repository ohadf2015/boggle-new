import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `single()` makes PostgREST answer **406 Not Acceptable** when the row is missing. For
 * `player_engagement` that is the ordinary state of a player who has not finished a game
 * yet — no row exists until then — so every new visitor generated a 406 (49 sessions in one
 * week) for a case the hook already handles: every field is read with `?? 0`.
 *
 * Pinned at the source level because the failure is invisible in behaviour — the hook
 * degrades correctly either way. Only the network log shows it.
 */
describe('useEngagementStatus', () => {
  it('reads possibly-absent rows with maybeSingle, never single', () => {
    const src = readFileSync(join(process.cwd(), 'hooks/useEngagementStatus.ts'), 'utf8');
    expect(src).not.toMatch(/\.single\(\)/);
    expect(src).toMatch(/player_engagement[\s\S]{0,200}?maybeSingle\(\)/);
  });
});
