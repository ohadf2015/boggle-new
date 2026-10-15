import { describe, it, expect } from 'vitest';
import { catalogueEntry, catalogueModes, deliveryKey, FEATURED_HOME_MODES } from '../ClassroomModeCatalogueData';

describe('mode delivery (SPEC modes table)', () => {
  it('Given the spec table, Then every catalogue mode says where it is played', () => {
    const table: Record<string, string> = {
      classic: 'both',
      'wheel-rush': 'both',
      'word-hunt': 'phones',
      blast: 'phones',
      'vocab-quiz': 'projector',
      wordcraft: 'phones',
      'boss-battle': 'projector',
    };
    for (const mode of catalogueModes()) expect([mode.id, mode.delivery]).toEqual([mode.id, table[mode.id]]);
    expect(catalogueModes()).toHaveLength(Object.keys(table).length);
  });

  it('Given a delivery, Then its label key is one shared key per kind', () => {
    expect(deliveryKey('projector')).toBe('eduShell.delivery.projector');
    expect(deliveryKey('phones')).toBe('eduShell.delivery.phones');
    expect(deliveryKey('both')).toBe('eduShell.delivery.both');
  });

  it('Given Teacher Home, Then it features Word Wheel, Word Hunt and Classic from the same table', () => {
    expect(FEATURED_HOME_MODES).toEqual(['wheel-rush', 'word-hunt', 'classic']);
    for (const id of FEATURED_HOME_MODES) expect(catalogueEntry(id)).toBeDefined();
  });
});
