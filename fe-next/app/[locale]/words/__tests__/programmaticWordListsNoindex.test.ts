import { describe, it, expect } from 'vitest';
import { nLetterWordsMetadata } from '../_nletter/NLetterWordsView';
import { generateMetadata as startingWithMetadata } from '../starting-with/[letter]/page';

/**
 * AdSense rejected www.lexiclash.live TWICE for "low value content"
 * (docs/2026-07-18-game-portals-web-ads-application-status.md §5). That rejection is what
 * keeps the WEB ad line — ~5x the native session volume — at zero revenue, leaving the
 * whole ad business on an Android app with 2-7 DAU.
 *
 * Auto-generated word lists with no original writing are the canonical trigger. Dropping
 * them from the sitemap is not enough: a page already in Google's index still counts
 * toward the site review, so the pages themselves must go noindex — the same treatment
 * /anagram/[letters] got on 2026-06-08.
 *
 * Cost check before removing: PostHog 60d shows ZERO pageviews across all 27 of these
 * URLs out of 7,673 site-wide. No traffic is being traded away.
 */
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

describe('programmatic word lists are noindex (AdSense low-value-content cleanup)', () => {
  it('noindexes /words/{n}-letter-words in every locale, including EN', async () => {
    for (const locale of LOCALES) {
      for (const n of [3, 4, 5, 6, 7, 8] as const) {
        const meta = await nLetterWordsMetadata(locale, n);
        expect(
          meta.robots,
          `/${locale}/words/${n}-letter-words must be noindex`,
        ).toMatchObject({ index: false });
      }
    }
  });

  it('noindexes /words/starting-with/[letter] in every locale, including EN', async () => {
    for (const locale of LOCALES) {
      for (const letter of ['a', 'q', 'z']) {
        const meta = await startingWithMetadata({
          params: Promise.resolve({ locale, letter }),
        } as never);
        expect(
          meta.robots,
          `/${locale}/words/starting-with/${letter} must be noindex`,
        ).toMatchObject({ index: false });
      }
    }
  });

  it('keeps follow:true so existing link equity still flows to the hub', async () => {
    const meta = await nLetterWordsMetadata('en', 5);
    expect(meta.robots).toMatchObject({ follow: true });
  });
});
