import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('LevelUpWatcher mount', () => {
  it('is mounted once, app-wide, so level-ups from any mode show where they happen', () => {
    const users = execSync("git grep -l '<LevelUpWatcher' -- '*.tsx' ':!**/__tests__/**'", { encoding: 'utf8' })
      .trim().split('\n').map((f) => f.replace(/^fe-next\//, ''));
    expect(users).toEqual(['app/essential-providers.tsx']);
    expect(readFileSync('app/essential-providers.tsx', 'utf8')).toMatch(/gameSurface && <LevelUpWatcher \/>/);
  });
});
