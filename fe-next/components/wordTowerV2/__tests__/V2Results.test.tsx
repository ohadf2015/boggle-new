import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));

import { V2Results } from '../V2Results';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const base = { t, peakM: 18, score: 2400, bestM: 18, isBest: true, run: { ...createRun(1), bestCombo: 4, tenants: 23, crates: 3 }, badges: [] as string[], unlocked: new Set<string>() };

describe('V2Results', () => {
  it('given a finished run, when play again is pressed, then the run restarts', () => {
    const onRestart = vi.fn();
    render(<V2Results {...base} onRestart={onRestart} />);
    expect(screen.getByText('wordTowerV2.collapsed')).toBeTruthy();
    fireEvent.click(screen.getByText('common.playAgain'));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('given a peak of 18m, when shown, then it is counted in floors (6)', () => {
    render(<V2Results {...base} onRestart={() => {}} />);
    expect(screen.getByLabelText('wordTowerV2.results.floorsA11y:6')).toBeTruthy();
  });

  it('given badges earned this run, when shown, then each is listed by name', () => {
    render(<V2Results {...base} badges={['fiveStory', 'lucky']} onRestart={() => {}} />);
    expect(screen.getByText('wordTowerV2.ach.fiveStory.name')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.ach.lucky.name')).toBeTruthy();
  });

  it('given a recap image, when shown, then it is a graphic not an emoji row', () => {
    render(<V2Results {...base} recapSrc="/api/word-tower/share?h=18&f=6" onRestart={() => {}} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/api/word-tower/share');
  });

  it('given the daily lock and a rank, when shown, then play again is hidden and the rank is shown', () => {
    render(<V2Results {...base} dailyLocked dailyRank={4} onRestart={() => {}} />);
    expect(screen.queryByText('common.playAgain')).toBeNull();
    expect(screen.getByText('wordTowerV2.dailyPlayed')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.dailyRank:4')).toBeTruthy();
  });

  it('given badges still locked, when shown, then the closest one is offered as the next goal', () => {
    render(<V2Results {...base} onRestart={() => {}} />);
    expect(screen.getByText('wordTowerV2.results.nextGoal')).toBeTruthy();
  });
});
