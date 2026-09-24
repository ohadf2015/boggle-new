/**
 * Every player avatar goes through the one compositor (components/avatar/art)
 * via `Avatar` or `AvatarLite`. Two ways it drifted before (2026-09-24):
 *  - a raw, unversioned `/api/avatar/png/${id}` url kept serving the
 *    pre-redraw face from device cache (HomeTopBar);
 *  - profile / referral screens drew `avatar_emoji` as a bare glyph.
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { describe, it, expect } from 'vitest';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

describe('avatar single source', () => {
  it('no component builds its own /api/avatar/png url — AvatarLite owns it (versioned)', () => {
    const hits = execSync(
      "git grep -lE '`/api/avatar/png/' -- 'components' 'app' ':!**/__tests__/**' ':!**/*.test.*' || true",
      { cwd: root, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .filter((f) => f !== 'components/AvatarLite.tsx');
    expect(hits).toEqual([]);
  });

  it.each([
    'app/[locale]/student/profile/PageClient.tsx',
    'app/[locale]/teacher/profile/PageClient.tsx',
    'app/[locale]/referrals/PageClient.tsx',
  ])('%s renders the real avatar, not an emoji glyph', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/<Avatar(Lite)?\b/);
    expect(src).not.toMatch(/\{[^}]*avatar_?[eE]moji[^}]*\}/);
  });
});
