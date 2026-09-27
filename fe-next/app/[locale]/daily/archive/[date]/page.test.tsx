import { describe, it, expect } from 'vitest';
import { generateMetadata } from './page';

// AdSense "low value content" remediation (2026-06-04):
// The per-date daily-archive pages are thin (stats/leaderboard snapshots) and were
// indexed across all 5 locales (~780 URLs), dragging the domain's average content
// quality below AdSense's bar. They must stay PLAYABLE but leave the search index.
// See docs/2026-06-04-adsense-approval-plan.md.
describe('daily archive [date] page — indexing policy', () => {
  const VALID_DATE = '2026-03-01'; // within [epoch 2025-12-30, yesterday]

  it('is noindex,follow on every locale (thin page kept playable, out of the index)', async () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      const meta = await generateMetadata({
        params: Promise.resolve({ locale, date: VALID_DATE }),
      });
      expect(meta.robots, `robots for locale ${locale}`).toEqual({
        index: false,
        follow: true,
      });
    }
  });

  it('still keeps a self-canonical so the live page is not orphaned', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'en', date: VALID_DATE }),
    });
    expect(meta.alternates?.canonical).toContain(`/en/daily/archive/${VALID_DATE}`);
  });
});
