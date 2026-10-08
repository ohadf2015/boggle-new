import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

describe('/words-with-friends-alternative metadata', () => {
  it('positions the page as an alternative and fits the SERP', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const title = String(meta.title);
    const description = String(meta.description);
    expect(title).toMatch(/^Words With Friends Alternative/);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description).toMatch(/alternative/i);
    expect(description.length).toBeLessThanOrEqual(155);
  });
});
