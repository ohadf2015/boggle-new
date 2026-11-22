import { getHowToPlayContent } from '../content';

describe('how-to-play Russian content', () => {
  it('has its own ru entry with the same shape as en', () => {
    const ru = getHowToPlayContent('ru');
    const en = getHowToPlayContent('en');
    expect(ru).not.toBe(en);
    expect(ru.pageTitle).toMatch(/[а-я]/i);
    expect(ru.scoring.rows).toHaveLength(en.scoring.rows.length);
    expect(ru.faq.items).toHaveLength(en.faq.items.length);
    for (const mode of ['classic', 'blast', 'wordHunt'] as const) {
      expect(ru.gameModes[mode].steps).toHaveLength(en.gameModes[mode].steps.length);
    }
  });
});
