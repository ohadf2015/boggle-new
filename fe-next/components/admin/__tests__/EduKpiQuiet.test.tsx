/**
 * KPI tiles all carry a trend line. Tiles with nothing to show (zero in both windows, or
 * unmeasured) collapse behind "Quiet metrics" so the active numbers lead.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>) => (typeof fb === 'string' ? fb : k),
    language: 'en',
  }),
}));

import { EduKpiGrid } from '../edu-dashboard/EduKpiGrid';

const delta = (current: number, prior: number) => ({
  current,
  prior,
  pct: prior === 0 ? null : Math.round(((current - prior) / prior) * 1000) / 10,
});

const data = (over: Record<string, unknown> = {}) =>
  ({
    windowDays: 7,
    roundsAvailable: true,
    kpis: {
      activeTeachers: delta(6, 3),
      newTeachers: delta(2, 2),
      classesWithLiveGame: delta(0, 0),
      liveRounds: delta(0, 0),
      trialsStarted: delta(3, 1),
      trialsPaid: delta(0, 0),
    },
    sparklines: {
      activeTeachers: [1, 2, 3],
      newTeachers: [0, 1, 2],
      classesWithLiveGame: [0, 0, 0],
      liveRounds: [0, 0, 0],
      trialsStarted: [0, 1, 3],
      trialsPaid: [0, 0, 0],
    },
    ...over,
  }) as never;

describe('EduKpiGrid', () => {
  it('keeps active tiles visible and collapses zero tiles under quiet metrics', () => {
    render(<EduKpiGrid data={data()} />);
    expect(within(screen.getByTestId('kpi-activeTeachers')).queryByText('Active teachers')).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-trialsPaid')).toBeInTheDocument();
    const quiet = screen.getByTestId('quiet-metrics');
    expect(quiet.tagName).toBe('DETAILS');
    expect(quiet.contains(screen.getByTestId('kpi-liveRounds'))).toBe(true);
    expect(quiet.contains(screen.getByTestId('kpi-trialsPaid'))).toBe(true);
    expect(quiet.contains(screen.getByTestId('kpi-activeTeachers'))).toBe(false);
  });

  it('draws a trend line on every tile that has a series', () => {
    render(<EduKpiGrid data={data()} />);
    for (const key of ['activeTeachers', 'newTeachers', 'trialsStarted']) {
      expect(screen.getByTestId(`kpi-${key}`).querySelector('svg polyline'), key).not.toBeNull();
    }
  });

  it('omits the quiet group when every tile has activity', () => {
    render(
      <EduKpiGrid
        data={data({
          kpis: {
            activeTeachers: delta(6, 3),
            newTeachers: delta(2, 2),
            classesWithLiveGame: delta(2, 1),
            liveRounds: delta(5, 1),
            trialsStarted: delta(3, 1),
            trialsPaid: delta(1, 0),
          },
        })}
      />,
    );
    expect(screen.queryByTestId('quiet-metrics')).toBeNull();
  });
});
