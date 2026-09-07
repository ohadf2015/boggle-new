import { describe, it, expect, vi } from 'vitest';

vi.mock('@/translations/loadTranslation', () => ({
  loadTranslation: vi.fn(async () => ({
    education: {
      results: {
        title: 'Lesson recap',
        assignMissGapAsyncTitle: 'Async miss-gap homework — {{lesson}}',
        assignMissGapAsyncShareText:
          '{{lesson}} — async miss-gap homework due {{due}}: {{missed}}',
        shareGapAllFoundText: '{{lesson}} — the class found every lesson word.',
      },
    },
  })),
}));

import { generateMetadata } from '../page';

describe('/education/miss-gap-assignment metadata — async homework unfurl', () => {
  it('is noindex so a parameterized tool route is not an SEO landing', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({
        lesson: 'Physics 101',
        missed: 'neutron',
        due: '2026-09-11',
        lang: 'en',
      }),
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('reuses miss-gap-practice OG image (class words only)', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({
        lesson: 'Physics 101',
        missed: 'neutron,quark',
        teacher: 'Ms. Cohen',
        due: '2026-09-11',
        lang: 'en',
      }),
    });
    const url = (meta.openGraph?.images as { url: string }[])?.[0]?.url;
    expect(url).toContain('https://www.lexiclash.live/api/og/miss-gap-practice');
    expect(url).toContain('neutron');
    expect(url).not.toContain('Maya');
  });
});
