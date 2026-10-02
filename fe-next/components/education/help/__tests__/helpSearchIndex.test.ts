import { describe, it, expect } from 'vitest';
import { searchHelp, type HelpSearchEntry } from '../helpSearchIndex';

const INDEX: HelpSearchEntry[] = [
  { slug: 'start-a-live-game', title: 'Start a live game', summary: 'Go live in one tap', keywords: 'projector, code', category: 'Live game', kind: 'article' },
  { slug: 'how-students-join', title: 'How students join', summary: 'Code, link or QR', keywords: 'no account, join code', category: 'Live game', kind: 'article' },
  { slug: 'teacher-pro-and-trial', title: 'Teacher Pro and the free trial', summary: 'What Pro adds', keywords: 'price, billing', category: 'Billing', kind: 'article' },
  { slug: 'ja', title: 'ライブゲームを始める', summary: 'ワンタップで開始', keywords: 'プロジェクター', category: 'ライブ', kind: 'article' },
];

describe('searchHelp', () => {
  it('returns nothing for a blank query', () => {
    expect(searchHelp(INDEX, '   ')).toEqual([]);
  });

  it('matches case-insensitively and ranks title hits above keyword hits', () => {
    const hits = searchHelp(INDEX, 'JOIN');
    expect(hits[0].slug).toBe('how-students-join');
  });

  it('finds an article by a keyword that is not in its title', () => {
    expect(searchHelp(INDEX, 'billing').map((h) => h.slug)).toEqual(['teacher-pro-and-trial']);
  });

  it('requires every word of a multi-word query', () => {
    expect(searchHelp(INDEX, 'live projector').map((h) => h.slug)).toEqual(['start-a-live-game']);
  });

  it('matches Japanese by substring, since there are no spaces', () => {
    expect(searchHelp(INDEX, 'ゲーム').map((h) => h.slug)).toEqual(['ja']);
  });
});
