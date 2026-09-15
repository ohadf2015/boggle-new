import { describe, it, expect } from 'vitest';
import { getShareParts, buildShareText, type ConnectionsShareData } from '../gameShareParts';

const t = (key: string) => {
  const map: Record<string, string> = {
    'share.emojiCard.connectionsHeader': 'LexiClash Word Bridge · {date}',
    'share.emojiCard.bridges': 'bridges',
    'share.emojiCard.rank': 'rank',
    'share.streak': 'streak',
    'common.pts': 'pts',
  };
  return map[key] ?? key;
};

const data: ConnectionsShareData = {
  mode: 'connections',
  dateISO: '2026-09-13',
  score: 350,
  solved: 3,
  total: 5,
  streak: 7,
  rank: 12,
};

describe('gameShareParts — connections mode', () => {
  it('renders the date in the header', () => {
    const parts = getShareParts(data, t);
    expect(parts.header).toBe('LexiClash Word Bridge · 2026-09-13');
  });

  it('shows the score with the pts label', () => {
    const parts = getShareParts(data, t);
    expect(parts.score).toBe('350');
    expect(parts.scoreLabel).toBe('pts');
  });

  it('lists solved/total bridges and streak as labeled stats', () => {
    const parts = getShareParts(data, t);
    expect(parts.stats).toContainEqual({ value: '3/5', label: 'bridges' });
    expect(parts.stats).toContainEqual({ value: '7', label: 'streak' });
  });

  it('includes rank stat only when rank is present', () => {
    expect(getShareParts(data, t).stats).toContainEqual({ value: '#12', label: 'rank' });
    const noRank = getShareParts({ ...data, rank: null }, t);
    expect(noRank.stats.find((s) => s.label === 'rank')).toBeUndefined();
  });

  it('omits the streak stat when streak is 0', () => {
    const parts = getShareParts({ ...data, streak: 0 }, t);
    expect(parts.stats.find((s) => s.label === 'streak')).toBeUndefined();
  });

  it('builds a share text with header, score and stats (no emoji)', () => {
    const text = buildShareText(data, t);
    expect(text).toContain('LexiClash Word Bridge · 2026-09-13');
    expect(text).toContain('350 pts');
    expect(text).toContain('3/5 bridges');
    expect(text).toContain('lexiclash.live');
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2B1B}-\u{2B1C}]/u);
  });
});
