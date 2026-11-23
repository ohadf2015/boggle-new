import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('selection store writers', () => {
  it('given a board path change, then every caller feeds the store through scheduleSelection, never a synchronous setSelection', () => {
    let out = '';
    try {
      out = execFileSync('git', ['grep', '-n', '-E', '\\.setSelection\\(', '--', 'components', 'hooks', 'app', 'lib'], { cwd: root, encoding: 'utf8' });
    } catch (e) {
      if ((e as { status?: number }).status !== 1) throw e;
    }
    const offenders = out
      .split('\n')
      .filter(Boolean)
      .filter((l) => !l.startsWith('hooks/useSelectionStore.ts:') && !/(__tests__|\.test\.)/.test(l));
    expect(offenders).toEqual([]);
  });
});
