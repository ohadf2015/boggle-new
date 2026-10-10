import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlastLeftRail, BlastRightRail } from '../BlastShellRails';

const t = (key: string) => key;

describe('BlastLeftRail', () => {
  it('given a solo round, then it teaches the live tile types instead of repeating the HUD numbers', () => {
    render(<BlastLeftRail t={t} />);
    expect(screen.getByTestId('blast-tile-legend')).toBeTruthy();
    expect(screen.getByTestId('shell-keys')).toBeTruthy();
    expect(screen.queryByTestId('shell-stats')).toBeNull();
    expect(screen.queryByTestId('shell-standings')).toBeNull();
  });

  it('given rivals on the leaderboard, then the live race leads the rail and marks the player', () => {
    render(
      <BlastLeftRail
        t={t}
        username="ada"
        leaderboard={[
          { username: 'ada', score: 40 },
          { username: 'bo', score: 90 },
        ]}
      />,
    );
    expect(screen.getByTestId('shell-standings')).toBeTruthy();
    expect(screen.getByTestId('shell-standing-ada').getAttribute('data-me')).toBe('true');
  });
});

describe('BlastRightRail', () => {
  it('given found words, then the newest is the fresh row', () => {
    render(<BlastRightRail t={t} words={['tea', 'steam']} />);
    expect(screen.getAllByTestId(/^shell-word-row-/)[0].getAttribute('data-word')).toBe('steam');
  });
});
