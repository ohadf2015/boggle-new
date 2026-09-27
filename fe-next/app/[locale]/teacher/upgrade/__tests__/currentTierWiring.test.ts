/**
 * P2 t_32179c7e: PageClient must pass useTeacherPro().hasPro into PricingCards
 * so a trialing/paying teacher is not labeled as Free.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const pageSource = readFileSync(join(__dirname, '../PageClient.tsx'), 'utf8');

describe('Upgrade PageClient — currentTier wiring', () => {
  it('passes currentTier from hasPro into PricingCards', () => {
    expect(pageSource).toMatch(/currentTier=\{hasPro \? ['"]pro['"] : ['"]free['"]\}/);
  });
});
