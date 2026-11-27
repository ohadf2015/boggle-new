import { describe, it, expect } from 'vitest';
import { wrappedSlides } from '../wrappedSlides';

const stats = { holiday: 'hanukkah' as const, lit: 6, total: 8, games: 14, words: 210, longest: 'menorah', huntFound: 5, huntGoal: 8, secrets: 2, titles: [], tableRank: null, tableSize: 0 };

describe('wrappedSlides', () => {
  it('Given a full recap, then intro, days, words, longest, hunt, secrets and finale in order', () => {
    expect(wrappedSlides(stats).map((s) => s.id)).toEqual(['intro', 'days', 'words', 'longest', 'hunt', 'secrets', 'finale']);
    expect(wrappedSlides(stats)[1].value).toBe('6/8');
    expect(wrappedSlides(stats)[3].value).toBe('MENORAH');
  });

  it('Given a Holiday Table, then a rank slide follows the secrets', () => {
    const slides = wrappedSlides({ ...stats, tableRank: 2, tableSize: 5 });
    const i = slides.findIndex((s) => s.id === 'table');
    expect(slides[i - 1].id).toBe('secrets');
    expect(slides[i]).toMatchObject({ value: '#2', labelKey: 'holiday.wrapped.table', params: { size: 5 } });
  });

  it('Given no longest word on record, then that slide is skipped rather than shown empty', () => {
    expect(wrappedSlides({ ...stats, longest: '' }).map((s) => s.id)).not.toContain('longest');
  });
});
