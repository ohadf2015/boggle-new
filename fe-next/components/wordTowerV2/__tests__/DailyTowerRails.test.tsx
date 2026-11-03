import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DailyTowerFeed, DailyTowerLeftRail } from '../DailyTowerRails';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${Object.values(params).join(',')}` : key);

const base = { t, dateLabel: '2 Nov', growthM: 3.4, targetM: 9, heightM: 21.25, floors: 7, streak: 4, standings: [] };

describe('DailyTowerLeftRail', () => {
  it('given a daily climb, then it shows growth, height, floors, streak and the goal bar', () => {
    render(<DailyTowerLeftRail {...base} />);

    expect(screen.getByTestId('shell-stat-grew').textContent).toContain('+3wordTowerV2.unitM');
    expect(screen.getByTestId('shell-stat-height').textContent).toContain('21.3');
    expect(screen.getByTestId('shell-stat-floors').textContent).toContain('7');
    expect(screen.getByTestId('shell-stat-streak').textContent).toContain('4');
    expect(screen.getByTestId('shell-stats-progress').textContent).toContain('38%');
  });

  it('given no board rows, then the race panel stays out', () => {
    render(<DailyTowerLeftRail {...base} />);
    expect(screen.queryByTestId('shell-standings')).toBeNull();
  });

  it('given board rows and a reached goal, then the race and the goal card sit in the rail', () => {
    render(
      <DailyTowerLeftRail
        {...base}
        standings={[{ id: 'a', name: 'dana', score: 12 }, { id: 'me', name: 'ohad', score: 3, isMe: true }]}
        goalCard={<div data-testid="goal" />}
      />,
    );
    const rail = document.querySelector('[data-wt2-rails]')!;
    expect(rail.querySelector('[data-testid="shell-standings"]')).toBeTruthy();
    expect(rail.querySelector('[data-testid="goal"]')).toBeTruthy();
  });

  it('teaches only the keys the tower answers to', () => {
    render(<DailyTowerLeftRail {...base} />);
    expect(screen.queryByText('gameShell.keys.clear')).toBeNull();
    expect(screen.getByText('gameShell.keys.submit')).toBeTruthy();
  });
});

describe('DailyTowerFeed', () => {
  it('lists built words newest first', () => {
    render(<DailyTowerFeed t={t} words={['stone', 'roof']} />);
    expect(screen.getByTestId('shell-word-row-roof').dataset.fresh).toBe('true');
    expect(screen.getByTestId('shell-word-row-stone').dataset.fresh).toBe('false');
  });
});
