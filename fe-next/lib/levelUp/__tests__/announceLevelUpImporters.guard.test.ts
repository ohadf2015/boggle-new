import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('announceLevelUp callers', () => {
  it('only publishLevelUp announces, so every mode gets the same reveal-or-celebration decision', () => {
    const users = execSync("git grep -l -w 'announceLevelUp' -- '*.ts' '*.tsx' ':!**/__tests__/**' ':!*.test.*'", { encoding: 'utf8' })
      .trim().split('\n').map((f) => f.replace(/^fe-next\//, '')).sort();
    expect(users).toEqual(['lib/avatar/revealTrigger.ts', 'lib/levelUp/levelUpBus.ts']);
  });
});
