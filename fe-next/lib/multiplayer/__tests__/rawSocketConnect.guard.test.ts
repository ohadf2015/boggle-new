import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('socket redial guard', () => {
  it('given client code, then no raw .connect() call bypasses redialSocket', () => {
    const hits = execSync(
      "git grep -nE '\\.connect\\(\\)' -- app components contexts hooks lib utils ':!**/__tests__/**' ':!lib/multiplayer/redialSocket.ts' || true",
      { encoding: 'utf8' },
    ).trim();
    expect(hits).toBe('');
  });
});
