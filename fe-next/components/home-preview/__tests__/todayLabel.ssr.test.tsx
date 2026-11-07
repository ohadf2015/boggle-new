import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { HeroQuickLinks } from '../HeroQuickLinks';
import { DailyBlock } from '../DailyBlock';

const t = (k: string) => k;

describe('home date labels and hydration', () => {
  afterEach(() => vi.useRealTimers());

  it('given the server render, then no date is printed (server and browser clocks/timezones differ)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'));
    const html =
      renderToString(<HeroQuickLinks lang="en" t={t} streak={0} streakLoading={false} />) +
      renderToString(<DailyBlock lang="en" t={t} streak={0} streakLoading={false} />);
    expect(html).not.toMatch(/Nov|Saturday|Sat/);
  });

  it('given the client after mount, then today is shown', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'));
    render(<HeroQuickLinks lang="en" t={t} streak={0} streakLoading={false} />);
    expect(screen.getByTestId('hp-chip-daily').textContent).toContain('Nov 7');
  });
});
