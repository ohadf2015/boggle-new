/**
 * `data-feedback-ignore-rage` was written at 11 sites and read nowhere, so no
 * surface was ever exempt and Word Tower kept producing ~half of the product's
 * $rageclick events from taps that are by design. Two things have to hold for
 * the marker to mean anything: a consumer in the one posthog-js `before_send`
 * slot, and the literal `="true"` on the Word Tower sites — the filter gates on
 * that value, and an empty-valued attribute is also the shape most at risk of
 * being dropped from the captured element payload.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MARKER = 'data-feedback-ignore-rage';

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('by-design rage-click marker', () => {
  it('is consumed by the before_send wired into posthog.init', () => {
    const provider = readFileSync(join(ROOT, 'components/providers/PostHogProvider.tsx'), 'utf8');
    expect(provider).toMatch(/before_send:\s*posthogBeforeSend/);

    const filter = readFileSync(join(ROOT, 'utils/posthogBeforeSend.ts'), 'utf8');
    expect(filter).toContain(MARKER);
  });

  it('is written as ="true" on every Word Tower site', () => {
    const files = [
      ...sourceFiles(join(ROOT, 'components/wordTower')),
      ...sourceFiles(join(ROOT, 'components/wordTowerV2')),
    ];
    const notExempt = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${f.slice(ROOT.length + 1)}:${i + 1}` }))
        .filter(({ line }) => line.includes(MARKER) && !line.includes(`${MARKER}="true"`))
        .map(({ at }) => at),
    );
    expect(notExempt).toEqual([]);
  });
});
