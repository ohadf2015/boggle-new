import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

const meta = (
  locale: string,
  query: Record<string, string | string[] | undefined> = {
    lesson: 'Physics 101',
    teacher: 'Ms. Cohen',
    found: '2',
    total: '3',
    missed: 'neutron',
    lang: locale,
  },
) =>
  generateMetadata({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(query),
  });

describe('/education/class-gap metadata — parent/Slack unfurl', () => {
  it('is noindex so a parameterized share card is not an SEO landing', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ index: false, follow: true });
  });

  it('points og:image at the class-gap OG route on lexiclash.live', async () => {
    const m = await meta('en');
    const images = m.openGraph?.images;
    const url = Array.isArray(images) ? (images[0] as { url: string }).url : '';
    expect(url).toContain('https://www.lexiclash.live/api/og/class-gap');
    expect(url).toContain('neutron');
    expect(url).not.toContain('lexiclash.com');
  });

  it('does not put student names in the unfurl', async () => {
    const m = await meta('en');
    const blob = JSON.stringify(m);
    expect(blob).not.toContain('Maya');
    expect(blob).not.toContain('Noa');
  });

  it('keeps the twitter large-image card for Slack/iMessage', async () => {
    const m = await meta('en');
    expect(m.twitter?.card).toBe('summary_large_image');
  });
});
