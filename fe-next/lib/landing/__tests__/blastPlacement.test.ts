import { describe, it, expect } from 'vitest';
import { BLAST_LOCALES, FEATURED_HOME_MODE, isBlastLocale, pickHomeAnchor } from '../blastPlacement';

describe('isBlastLocale', () => {
  it('offers Blast only where it has a letter pool', () => {
    expect([...BLAST_LOCALES].sort()).toEqual(['en', 'es', 'he', 'ja', 'sv']);
    for (const l of BLAST_LOCALES) expect(isBlastLocale(l)).toBe(true);
    expect(isBlastLocale('ru')).toBe(false);
    expect(isBlastLocale('fr')).toBe(false);
  });
});

describe('pickHomeAnchor', () => {
  it('features blast on the homepage', () => {
    expect(FEATURED_HOME_MODE).toBe('blast');
  });

  it('gives blast the hero slot wherever it sits in the order', () => {
    expect(pickHomeAnchor(['daily', 'arena', 'adventure', 'blast'])).toBe('blast');
    expect(pickHomeAnchor(['blast', 'arena'])).toBe('blast');
  });

  it('falls back to the live arena when blast is not on offer', () => {
    expect(pickHomeAnchor(['daily', 'arena', 'adventure'])).toBe('arena');
  });
});
