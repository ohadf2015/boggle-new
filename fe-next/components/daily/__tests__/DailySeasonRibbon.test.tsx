import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailySeasonRibbon } from '../DailySeasonRibbon';

// Component types are cached per tag: a Proxy that hands out a NEW component on
// every property access remounts the whole tree on each state update, which
// detaches the element a pointer sequence (userEvent) is in the middle of clicking.
vi.mock('framer-motion', () => {
  const cache = new Map<string, React.FC<React.PropsWithChildren<Record<string, unknown>>>>();
  return {
    m: new Proxy({}, {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Comp: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children, ...props }) => <div {...props}>{children}</div>;
          Comp.displayName = `m.${tag}`;
          cache.set(tag, Comp);
        }
        return cache.get(tag);
      },
    }),
  useReducedMotion: () => false,
  };
});

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) => {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : undefined;
  const map: Record<string, string> = {
    'season.name': 'Season {{number}}: {{theme}}',
    'wordHunt.leaderboard.seasonEndsIn': 'Ends in {days}d {hours}h',
    'wordHunt.leaderboard.seasonEnded': 'Season over',
    'wordHunt.leaderboard.seasonHint': 'Every daily you play adds to your season score',
    'season.twist.throne-climb.title': 'Throne Climb',
  };
  let out = map[key] ?? key;
  for (const [k, v] of Object.entries(params ?? {})) out = out.replace(`{{${k}}}`, String(v)).replace(`{${k}}`, String(v));
  return out;
};

describe('DailySeasonRibbon', () => {
  const season = { id: 6, theme: 'Lexicon Lords', startDate: '2026-09-01T00:00:00Z', endDate: '2026-10-01T00:00:00Z' };

  it('names the season with its theme, twist and a live countdown', () => {
    render(<DailySeasonRibbon season={season} isCurrent now={new Date('2026-09-07T10:00:00Z')} t={t} />);
    expect(screen.getByText('Season 6: Lexicon Lords')).toBeInTheDocument();
    expect(screen.getByText('Throne Climb')).toBeInTheDocument();
    expect(screen.getByText('Ends in 23d 14h')).toBeInTheDocument();
    expect(screen.getByText('Every daily you play adds to your season score')).toBeInTheDocument();
  });

  it('paints the season accent and skin so each month looks different', () => {
    const { container } = render(<DailySeasonRibbon season={season} isCurrent now={new Date('2026-09-07T10:00:00Z')} t={t} />);
    const ribbon = screen.getByTestId('daily-season-ribbon');
    expect(ribbon.className).toContain('season-skin-lexicon');
    expect(container.querySelector('[data-testid="daily-season-accent"]')).toHaveStyle({ backgroundColor: '#FF6B35' });
  });

  it('says a past season is over instead of counting down', () => {
    render(<DailySeasonRibbon season={{ ...season, id: 5, theme: 'Phonic Phenoms', endDate: '2026-09-01T00:00:00Z' }} isCurrent={false} now={new Date('2026-09-07T10:00:00Z')} t={t} />);
    expect(screen.getByText('Season over')).toBeInTheDocument();
    expect(screen.queryByText(/Ends in/)).not.toBeInTheDocument();
  });
});
