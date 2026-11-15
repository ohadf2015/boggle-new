import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { rankFor } from '@/lib/wordTowerV2/rush/rankLadder';
import { RankCard, metresToNextTier } from '../RankCard';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);

describe('RankCard', () => {
  it('given a peak of 83.9 m, when read, then it is 37 m to the next rank (supertall at 120)', () => {
    expect(metresToNextTier(rankFor(83.9))).toBe(37);
  });

  it('given the top rank, when read, then there is no next rank', () => {
    expect(metresToNextTier(rankFor(999))).toBeNull();
  });

  it('given a rank, when rendered, then it names the next rank and the metres to it', () => {
    const { container } = render(<RankCard t={t} rank={rankFor(83.9)} />);
    expect(container.querySelector('[data-wt2-rank-next]')?.textContent).toBe(
      'wordTowerV2.hud.sheet.rankToNext {"m":37,"name":"wordTowerV2.rush.rank.supertall"}',
    );
  });
});
