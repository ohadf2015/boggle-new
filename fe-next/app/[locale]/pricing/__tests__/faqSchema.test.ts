import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('/pricing FAQ structured data', () => {
  it('is built from the same entries the page renders, like /teacher/upgrade', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).toContain('buildUpgradeFaqEntries(t)');
    expect(src).not.toMatch(/'faqCancel'/);
  });
});
