// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MultiplayerOnline from '../multiplayer-word-game-online/page';
import WordGamesFree from '../word-games-online-free/page';
import WithFriends from '../online-word-games-with-friends/page';

// The "multiplayer / free word game" landing pages each carry substantive, differentiated
// content. To read as an INTENTIONAL content hub (not isolated SEO doorways), each must
// reciprocally cross-link the other two siblings. (AdSense "low value content" recovery —
// docs/2026-06-04-adsense-approval-plan.md: additive internal linking, not page removal.)

const SIBLINGS = {
  multiplayerOnline: 'multiplayer-word-game-online',
  wordGamesFree: 'word-games-online-free',
  withFriends: 'online-word-games-with-friends',
} as const;

async function hrefsOf(Page: (p: { params: Promise<{ locale: string }> }) => Promise<React.ReactElement>) {
  const { container } = render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') || '');
}

describe('multiplayer/free-word-game landing hub — reciprocal cross-linking', () => {
  it('multiplayer-word-game-online links to both siblings', async () => {
    const hrefs = await hrefsOf(MultiplayerOnline);
    expect(hrefs.some((h) => h.includes(SIBLINGS.wordGamesFree))).toBe(true);
    expect(hrefs.some((h) => h.includes(SIBLINGS.withFriends))).toBe(true);
  });

  it('word-games-online-free links to both siblings', async () => {
    const hrefs = await hrefsOf(WordGamesFree);
    expect(hrefs.some((h) => h.includes(SIBLINGS.multiplayerOnline))).toBe(true);
    expect(hrefs.some((h) => h.includes(SIBLINGS.withFriends))).toBe(true);
  });

  it('online-word-games-with-friends links to both siblings', async () => {
    const hrefs = await hrefsOf(WithFriends);
    expect(hrefs.some((h) => h.includes(SIBLINGS.multiplayerOnline))).toBe(true);
    expect(hrefs.some((h) => h.includes(SIBLINGS.wordGamesFree))).toBe(true);
  });
});
