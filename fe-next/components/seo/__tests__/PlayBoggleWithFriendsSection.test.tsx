import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRIENDS_ANSWER, FRIENDS_MODES } from '../PlayBoggleWithFriendsSection';

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('PlayBoggleWithFriendsSection facts', () => {
  it('leads with a 40–60 word answer that matches InviteCard', () => {
    expect(words(FRIENDS_ANSWER)).toBeGreaterThanOrEqual(40);
    expect(words(FRIENDS_ANSWER)).toBeLessThanOrEqual(60);
    expect(FRIENDS_ANSWER).toMatch(/4-letter room code/i);
    expect(FRIENDS_ANSWER).toMatch(/\bQR\b/);
    expect(FRIENDS_ANSWER).toMatch(/share button/i);
    expect(FRIENDS_ANSWER).toMatch(/any browser/i);
    expect(FRIENDS_ANSWER).toMatch(/no download/i);
  });

  it('tables the four room modes at the shared 50-player cap, and nothing admin-gated', () => {
    expect(FRIENDS_MODES.map((row) => row.mode)).toEqual([
      'Classic',
      'Blast',
      'Word Hunt',
      'Wheel Rush',
    ]);
    for (const row of FRIENDS_MODES) {
      expect(row.players).toBe('Up to 50');
    }
    const src = read('components/seo/PlayBoggleWithFriendsSection.tsx');
    expect(src).not.toMatch(/aggregateRating|reviewCount|5-star/i);
  });
});

describe('friends-query internal links', () => {
  const anchor = 'play Boggle with friends online';

  it('homepage English cross-link uses the anchor and the ranking page', () => {
    expect(read('translations/en.js')).toContain('"crossLink": "Play Boggle with friends online"');
    expect(read('components/landing/fresh/FreshCrossLink.tsx')).toContain(
      "en: '/en/play-boggle-online-free'",
    );
  });

  it('online-word-games-with-friends links the anchor to the ranking page', () => {
    const src = read('app/[locale]/online-word-games-with-friends/page.tsx');
    expect(src).toContain(anchor);
    expect(src).toContain('play-boggle-online-free');
  });

  it('best-boggle-alternatives article links the anchor to the ranking page', () => {
    const src = read('app/[locale]/blog/best-boggle-alternatives-2026/PageClient.tsx');
    expect(src).toContain(anchor);
    expect(src).toContain('/en/play-boggle-online-free');
  });
});
