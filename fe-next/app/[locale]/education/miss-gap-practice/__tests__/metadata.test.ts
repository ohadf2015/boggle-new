import { describe, it, expect, vi } from 'vitest';

vi.mock('@/translations/loadTranslation', () => ({
  loadTranslation: vi.fn(async () => ({
    education: {
      results: {
        title: 'Lesson recap',
        shareMissGapPracticeTitle: 'Miss-gap practice card',
        shareMissGapPracticeText:
          '{{lesson}} — take-home miss-gap practice (print or save PDF): {{missed}}',
        shareGapAllFoundText: '{{lesson}} — the class found every lesson word.',
      },
    },
  })),
}));

import { generateMetadata } from '../page';

describe('/education/miss-gap-practice metadata — take-home practice unfurl', () => {
  it('is noindex so a parameterized share card is not an SEO landing', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({
        lesson: 'Physics 101',
        missed: 'neutron',
        lang: 'en',
      }),
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('points og:image at the miss-gap-practice OG route on lexiclash.live', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({
        lesson: 'Physics 101',
        missed: 'neutron,quark',
        teacher: 'Ms. Cohen',
        found: '2',
        total: '3',
        lang: 'en',
      }),
    });
    const url = (meta.openGraph?.images as { url: string }[])?.[0]?.url;
    expect(url).toContain('https://www.lexiclash.live/api/og/miss-gap-practice');
    expect(url).toContain('neutron');
    expect(url).not.toContain('Maya');
  });
});
