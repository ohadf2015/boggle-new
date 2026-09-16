/**
 * The projector's state sentence.
 *
 * A teacher running a live lesson on 2026-09-14 reported that "the students and
 * I weren't really sure who was battling whom as the game progressed". They
 * were right: the broadcast screen received no classroom context at all, so a
 * team battle and a free-for-all rendered identically — one flat list of names.
 * This bar is the answer, and these tests pin what it has to say.
 */

import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvBattleBar from '../TvBattleBar';
import type { ClassroomLiveContext } from '@/shared/utils/classroomLiveContext';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...rest }: any) => (
      <div className={className} style={style} data-testid={rest['data-testid']}>
        {children}
      </div>
    ),
  },
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => true,
}));

const t = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    'tvBroadcast.classroom.round': 'Round {number}',
    'tvBroadcast.classroom.teamBattle': 'Team battle',
    'tvBroadcast.classroom.freeForAll': 'Everyone vs everyone',
    'education.results.teamBattle.teamName': 'Team {number}',
  };
  let out = dict[key] ?? key;
  for (const [k, v] of Object.entries(params ?? {})) {
    out = out.replace(`{${k}}`, String(v));
  }
  return out;
};

const ffa: ClassroomLiveContext = {
  round: 1,
  lessonName: 'Weather Words',
  playStyle: 'ffa',
};

const teams: ClassroomLiveContext = {
  round: 2,
  lessonName: 'Weather Words',
  playStyle: 'teams',
  teamCount: 2,
  teams: [
    { id: 0, memberNames: ['ana', 'cy'] },
    { id: 1, memberNames: ['bo', 'di'] },
  ],
};

describe('TvBattleBar', () => {
  it('renders nothing outside a classroom game', () => {
    const { container } = render(<TvBattleBar classroom={null} players={[]} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the lesson and numbers the round', () => {
    render(<TvBattleBar classroom={teams} players={[]} t={t} />);
    expect(screen.getByText('Round 2')).toBeInTheDocument();
    expect(screen.getByText('Weather Words')).toBeInTheDocument();
  });

  it('says a free-for-all is a free-for-all, and draws no tug-of-war', () => {
    // There are no sides in a free-for-all. Drawing a split bar would invent
    // structure the game does not have.
    render(<TvBattleBar classroom={ffa} players={[{ username: 'ana', score: 10 }]} t={t} />);
    expect(screen.getByText('Everyone vs everyone')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-battle-tug')).not.toBeInTheDocument();
  });

  it('draws one segment per team, each carrying that team’s live total', () => {
    render(
      <TvBattleBar
        classroom={teams}
        players={[
          { username: 'ana', score: 300 },
          { username: 'cy', score: 200 },
          { username: 'bo', score: 100 },
          { username: 'di', score: 0 },
        ]}
        t={t}
      />
    );
    expect(screen.getByTestId('tv-battle-tug')).toBeInTheDocument();
    expect(screen.getByTestId('tv-battle-team-0')).toHaveTextContent('500');
    expect(screen.getByTestId('tv-battle-team-1')).toHaveTextContent('100');
  });

  it('splits the bar by score share', () => {
    render(
      <TvBattleBar
        classroom={teams}
        players={[
          { username: 'ana', score: 750 },
          { username: 'bo', score: 250 },
        ]}
        t={t}
      />
    );
    expect(screen.getByTestId('tv-battle-team-0')).toHaveStyle({ width: '75%' });
    expect(screen.getByTestId('tv-battle-team-1')).toHaveStyle({ width: '25%' });
  });

  it('splits evenly before anyone has scored', () => {
    // Nobody is ahead at 0-0, and a bar that says otherwise is a lie the whole
    // room can see.
    render(<TvBattleBar classroom={teams} players={[]} t={t} />);
    expect(screen.getByTestId('tv-battle-team-0')).toHaveStyle({ width: '50%' });
    expect(screen.getByTestId('tv-battle-team-1')).toHaveStyle({ width: '50%' });
  });

  it('counts a student the deal has not met yet as nobody’s points', () => {
    // A late arrival is seated at the NEXT round start; until then their score
    // must not be silently credited to a team.
    render(
      <TvBattleBar
        classroom={teams}
        players={[
          { username: 'ana', score: 100 },
          { username: 'bo', score: 100 },
          { username: 'zed', score: 999 },
        ]}
        t={t}
      />
    );
    expect(screen.getByTestId('tv-battle-team-0')).toHaveTextContent('100');
    expect(screen.getByTestId('tv-battle-team-1')).toHaveTextContent('100');
  });

  it('matches a student whatever case they retyped their nickname in', () => {
    render(
      <TvBattleBar
        classroom={teams}
        players={[{ username: 'ANA', score: 40 }]}
        t={t}
      />
    );
    expect(screen.getByTestId('tv-battle-team-0')).toHaveTextContent('40');
  });
});
