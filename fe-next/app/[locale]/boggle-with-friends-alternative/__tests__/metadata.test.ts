import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

describe('/boggle-with-friends-alternative metadata', () => {
  it('positions the page as an alternative and fits the SERP', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const title = String(meta.title);
    const description = String(meta.description);
    expect(title).toMatch(/^Boggle With Friends Alternative/);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description).toMatch(/alternative/i);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it('indexes the English page only and keeps a share image', async () => {
    const en = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const sv = await generateMetadata({ params: Promise.resolve({ locale: 'sv' }) });
    expect(en.robots).toEqual({ index: true, follow: true });
    expect(sv.robots).toEqual({ index: false, follow: true });
    expect(en.alternates?.canonical).toBe('https://www.lexiclash.live/en/boggle-with-friends-alternative');
    expect(en.openGraph?.images).toBeTruthy();
  });
});
