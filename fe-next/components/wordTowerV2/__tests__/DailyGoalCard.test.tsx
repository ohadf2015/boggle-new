import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DailyGoalCard } from '../DailyGoalCard';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${Object.values(params).join(',')}` : key);

describe('DailyGoalCard', () => {
  it('given the goal was reached, then it shows the metres grown and both choices', () => {
    render(<DailyGoalCard t={t} growthM={12} onKeepClimbing={() => {}} onBank={() => {}} />);

    expect(screen.getByRole('status').textContent).toContain('wordTowerV2.dailyTower.goalToast:12');
    expect(screen.getByRole('button', { name: 'wordTowerV2.dailyTower.goalKeep' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'wordTowerV2.dailyTower.goalBank' })).toBeTruthy();
  });

  it('given a tap on bank, then onBank fires once and onKeepClimbing does not', () => {
    const onBank = vi.fn();
    const onKeepClimbing = vi.fn();
    render(<DailyGoalCard t={t} growthM={12} onKeepClimbing={onKeepClimbing} onBank={onBank} />);

    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.dailyTower.goalBank' }));

    expect(onBank).toHaveBeenCalledTimes(1);
    expect(onKeepClimbing).not.toHaveBeenCalled();
  });

  it('given a tap on keep climbing, then onKeepClimbing fires', () => {
    const onKeepClimbing = vi.fn();
    render(<DailyGoalCard t={t} growthM={12} onKeepClimbing={onKeepClimbing} onBank={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.dailyTower.goalKeep' }));

    expect(onKeepClimbing).toHaveBeenCalledTimes(1);
  });
});
