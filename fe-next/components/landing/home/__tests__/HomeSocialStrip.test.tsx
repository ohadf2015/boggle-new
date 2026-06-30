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
      <HomeSocialStrip activePlayers={324} gamesToday={1200} gameModes={4} languages={5} t={t} />,
    );
    expect(screen.getByText('324')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a loading skeleton for the online cell — never a stale "0" — while live stats resolve', () => {
    render(
      <HomeSocialStrip
        activePlayers={0}
        gamesToday={1200}
        gameModes={4}
        languages={5}
        t={t}
        liveStatsLoading
      />,
    );
    // The online cell must be a skeleton, not the misleading "0".
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    // SSR-provided / static cells still render their real values.
    expect(screen.getByText('1.2k')).toBeInTheDocument(); // gamesToday (formatLiveShort)
    expect(screen.getByText('4')).toBeInTheDocument(); // modes
    expect(screen.getByText('5')).toBeInTheDocument(); // languages
  });

  it('drops the live cells when there is no activity — never paints a bald "0"', () => {
    // GIVEN a quiet moment: nobody in live rooms and no games logged yet today,
    // with live stats already resolved (not loading).
    render(
      <HomeSocialStrip activePlayers={0} gamesToday={0} gameModes={4} languages={6} t={t} />,
    );
    // THEN the misleading zero cells are omitted entirely...
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
    expect(screen.queryByText('Games today')).not.toBeInTheDocument();
    // ...and the always-credible trust stats still show.
    expect(screen.getByText('Modes')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('surfaces the online cell as soon as there is real activity', () => {
    render(
      <HomeSocialStrip activePlayers={7} gamesToday={0} gameModes={4} languages={6} t={t} />,
    );
    // Online appears with its real count...
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // ...but games-today stays hidden while it is still 0.
    expect(screen.queryByText('Games today')).not.toBeInTheDocument();
  });
});
