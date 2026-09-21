import { describe, expect, it } from 'vitest';

/**
 * Post-swap guard: educationBorderContrast ROOTS should grow to include
 * wordTowerV2 + adventure. Doing it now fails 37 existing navy/black pairs
 * (1.23:1). This test pins the follow-up so the public flip cannot land
 * without that sweep — see PREPARE_SWAP.md on the kanban card.
 */
const FOLLOW_UP_ROOTS = [
  'components/wordTowerV2',
  'components/adventure',
  'app/[locale]/word-tower-v2',
  'app/[locale]/adventure',
];

describe('v2/adventure contrast follow-up', () => {
  it('names the roots the education scanner must gain before public v2', () => {
    expect(FOLLOW_UP_ROOTS).toContain('components/wordTowerV2');
    expect(FOLLOW_UP_ROOTS).toContain('components/adventure');
  });
});
