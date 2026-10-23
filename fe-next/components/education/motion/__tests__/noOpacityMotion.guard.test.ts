import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['components/education/motion', 'lib/education/motion'];

const sources = ROOTS.flatMap((dir) =>
  readdirSync(join(process.cwd(), dir))
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(dir, f)),
);

describe('motion-kit sources', () => {
  it('finds the kit sources', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(sources)('%s never tweens opacity', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf8');
    expect(src).not.toMatch(/opacity\s*:|opacity-0|@keyframes[^}]*opacity/);
  });
});
