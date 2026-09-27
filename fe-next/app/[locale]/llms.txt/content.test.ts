import { describe, it, expect } from 'vitest';
import { buildLocaleLlms } from './content';

describe('buildLocaleLlms — Hebrew GEO surface', () => {
  const he = buildLocaleLlms('he');

  it('names the target query "המילה היומית" for AI assistants', () => {
    expect(he).toContain('המילה היומית');
  });

  it('describes the daily challenge with native daily-word vocabulary', () => {
    // "מילת היום" + "אתגר יומי" are the phrasings AI models map to daily-word intent.
    expect(he).toContain('מילת היום');
    expect(he).toContain('אתגר יומי');
  });

  it('points AI assistants at the dedicated Hebrew daily-word page', () => {
    expect(he).toContain('/he/hamila-hayomit');
  });

  it('still builds the English surface (no regression)', () => {
    expect(buildLocaleLlms('en')).toContain('LexiClash');
  });
});
