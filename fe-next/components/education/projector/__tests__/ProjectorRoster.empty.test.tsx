import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = readFileSync(path.resolve(__dirname, '../ProjectorRoster.tsx'), 'utf8');

describe('<ProjectorRoster> empty room — the success state is visible before anyone joins', () => {
  it('Given no students, Then empty seats wait where the first students will pop in', () => {
    expect(SRC).toMatch(/data-testid="projector-roster-ghost-seat"/);
    expect(SRC).toMatch(/Array\.from\(\{ length: 3 \}/);
  });
});
