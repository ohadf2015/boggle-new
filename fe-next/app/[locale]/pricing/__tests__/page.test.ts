import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('locale pricing route', () => {
  it('ships app/[locale]/pricing/page.tsx so /en/pricing is not a 404', () => {
    const page = join(__dirname, '..', 'page.tsx');
    expect(existsSync(page), page).toBe(true);
  });
});
