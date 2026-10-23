import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { RoundCelebration } from '../RoundCelebration';
import { pressClasses } from '../pressClasses';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

let round = 0;
let base = { roundKey: 'r0', rank: 2, total: 9, score: 140, hero: <span>edu.hero</span>, t };

beforeEach(() => {
  motionPref.reduced = true;
  base = { ...base, roundKey: `r${++round}` };
});

describe('RoundCelebration', () => {
  it('opens the results beat with the rank headline and a points chip', () => {
    render(<RoundCelebration {...base} />);
    expect(screen.getByTestId('edu-celebration')).toBeTruthy();
    expect(screen.getByText('eduLiveRoom.studentResults.rankOf:{"rank":2,"total":9}')).toBeTruthy();
    expect(screen.getByText('eduLiveRoom.studentResults.points')).toBeTruthy();
    expect(screen.queryByText('common.xp')).toBeNull();
    expect(screen.queryByText('common.coins')).toBeNull();
  });

  it('adds xp and coins chips only when the round earned them', () => {
    render(<RoundCelebration {...base} xp={30} coins={5} />);
    expect(screen.getByText('common.xp')).toBeTruthy();
    expect(screen.getByText('common.coins')).toBeTruthy();
  });

  it('continue is a kit press button and dismisses the beat for this round', () => {
    const onDone = vi.fn();
    const { rerender } = render(<RoundCelebration {...base} onDone={onDone} />);
    const cta = screen.getByTestId('edu-celebration-continue');
    expect(cta.textContent).toBe('common.continue');
    for (const cls of pressClasses(4).split(' ')) expect(cta.className).toContain(cls);
    fireEvent.click(cta);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('edu-celebration')).toBeNull();
    rerender(<RoundCelebration {...base} onDone={onDone} />);
    expect(screen.queryByTestId('edu-celebration')).toBeNull();
    rerender(<RoundCelebration {...base} roundKey={`${base.roundKey}-next`} onDone={onDone} />);
    expect(screen.getByTestId('edu-celebration')).toBeTruthy();
  });

  it('a remount for a round already shown does not replay the beat', () => {
    const first = render(<RoundCelebration {...base} roundKey="seen-once" />);
    expect(screen.getByTestId('edu-celebration')).toBeTruthy();
    first.unmount();
    render(<RoundCelebration {...base} roundKey="seen-once" />);
    expect(screen.queryByTestId('edu-celebration')).toBeNull();
  });

  it('renders nothing before a placing exists', () => {
    render(<RoundCelebration {...base} rank={0} total={0} />);
    expect(screen.queryByTestId('edu-celebration')).toBeNull();
  });

  it('labels skip from t', () => {
    motionPref.reduced = false;
    render(<RoundCelebration {...base} />);
    expect(screen.getByText('common.skip')).toBeTruthy();
  });
});
