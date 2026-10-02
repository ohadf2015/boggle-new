/**
 * P2 t_32179c7e: PageClient must label the current plan from auth + entitlement:
 * a trialing/paying teacher is not Free, and a logged-out visitor is on no plan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const pageSource = readFileSync(join(__dirname, '../PageClient.tsx'), 'utf8');

describe('Upgrade PageClient — current plan wiring', () => {
  it('derives the viewer from auth AND the entitlement, so a logged-out visitor is never "free"', () => {
    expect(pageSource).toMatch(/upgradeViewer\(\{ authLoading, signedIn: Boolean\(user\), proLoading, known: known === true, hasPro \}\)/);
    expect(pageSource).toMatch(/viewer=\{viewer\}/);
  });
});
