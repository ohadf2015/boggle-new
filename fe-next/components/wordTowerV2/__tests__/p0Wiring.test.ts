import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const v2 = code(readFileSync(resolve(__dirname, '../WordTowerV2.tsx'), 'utf8'));
const run = code(readFileSync(resolve(__dirname, '../useTowerRun.ts'), 'utf8'));
// The ?demo=1 staff gate lives in useV2Ready since the daily/leave-confirm
// refactor; WordTowerV2 must route its search-params handling through it.
const ready = code(readFileSync(resolve(__dirname, '../useV2Ready.ts'), 'utf8'));

describe('v2 P0 wiring', () => {
  it('staff-gates the ?demo=1 review hooks instead of seeding on any visitor', () => {
    expect(ready).toMatch(/canUseV2ReviewHooks/);
    expect(ready).toMatch(/v2ReviewHooksFromSearch/);
    expect(v2).toMatch(/useV2Ready/);
    expect(v2).not.toMatch(/if \(params\.has\('demo'\)\) seedDemo/);
  });

  it('starts telemetry on hoist and ends it in endRun', () => {
    expect(run).toMatch(/startV2Run/);
    expect(run).toMatch(/endV2Run/);
  });
});
