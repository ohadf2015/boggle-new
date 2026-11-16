import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import { styleProgress } from '@/lib/wordTowerV2/towerStyle';
import { StyleBanner } from '../StyleBanner';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);

describe('StyleBanner', () => {
  it('given a fresh estate, when shown, then it names the current look and the upgrades to the next one', () => {
    const { container } = render(<StyleBanner t={t} progress={styleProgress(emptyEstate())} />);
    expect(container.querySelector('[data-wt2-style-banner]')?.getAttribute('data-wt2-style-banner')).toBe('walkup');
    expect(container.textContent).toContain('wordTowerV2.style.name.walkup');
    expect(container.querySelector('[data-wt2-style-next]')?.textContent).toBe(
      'wordTowerV2.style.next {"n":4,"name":"wordTowerV2.style.name.brownstone"}',
    );
  });
});
