import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he';

describe('claim burst in Hebrew', () => {
  it('keeps "+3" reading as plus-three inside a right-to-left line', () => {
    const line = (he as unknown as { education: { race: { youClaimed: string } } }).education.race.youClaimed;
    expect(line).toContain('⁦+{bonus}⁩');
  });
});
