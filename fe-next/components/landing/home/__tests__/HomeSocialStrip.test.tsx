import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeSocialStrip } from '../HomeSocialStrip';

const t = (key: string) => {
  const dict: Record<string, string> = {
    'landing.home.online': 'Online',
    'landing.home.gamesToday': 'Games today',
    'landing.home.modes': 'Modes',
    'landing.home.languages': 'Languages',
  };
  return dict[key] ?? key;
};

describe('HomeSocialStrip', () => {
  it('renders the live online count when live stats have loaded', () => {
    render(
      <HomeSocialStrip activePlayers={324} gamesToday={1200} t={t} />,
    );
    expect(screen.getByText('324')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a loading skeleton for the online cell — never a stale "0" — while live stats resolve', () => {
    render(
      <HomeSocialStrip
        activePlayers={0}
        gamesToday={1200}
        t={t}
        liveStatsLoading
      />,
    );
    // The online cell must be a skeleton, not the misleading "0".
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    // SSR-provided / static cells still render their real values.
    expect(screen.getByText('1.2k')).toBeInTheDocument(); // gamesToday (formatLiveShort)
  });

  it('renders nothing on a quiet moment — no static "N modes / N languages" filler', () => {
    // GIVEN nobody in live rooms and no games logged yet today (resolved, not loading).
    // A returning player's hub has no use for trust stats, and a hardcoded mode
    // count drifted from the modes shown right above it.
    const legacy = { gameModes: 4, languages: 6 } as object;
    const { container } = render(<HomeSocialStrip activePlayers={0} gamesToday={0} t={t} {...legacy} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('surfaces the online cell as soon as there is real activity', () => {
    render(
      <HomeSocialStrip activePlayers={7} gamesToday={0} t={t} />,
    );
    // Online appears with its real count...
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // ...but games-today stays hidden while it is still 0.
    expect(screen.queryByText('Games today')).not.toBeInTheDocument();
  });
});
