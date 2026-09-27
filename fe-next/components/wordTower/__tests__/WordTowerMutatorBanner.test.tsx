import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordTowerMutatorBanner } from '../WordTowerMutatorBanner';
import { MUTATORS, mutatorForDate } from '@/lib/wordTower/dailyMutators';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

afterEach(() => vi.useRealTimers());

describe('WordTowerMutatorBanner', () => {
  it('announces the active mutator name + description on entry', () => {
    render(<WordTowerMutatorBanner mutator={MUTATORS.skylineRush} t={t} />);
    expect(screen.getByText('wordTower.mutator.skylineRush.name')).toBeInTheDocument();
    expect(screen.getByText(/wordTower\.mutator\.skylineRush\.desc/)).toBeInTheDocument();
  });

  it('interpolates the golden letter into the description', () => {
    const m = mutatorForDate('2026-06-11', 'en');
    const golden = m.id === 'goldenLetter' ? m : { ...MUTATORS.goldenLetter, goldenLetter: 'R' };
    render(<WordTowerMutatorBanner mutator={golden} t={t} />);
    // desc key is rendered with the letter param appended by our test `t`
    expect(screen.getByText(new RegExp(`desc:${golden.goldenLetter}`))).toBeInTheDocument();
  });

  it('auto-hides after the intro window', () => {
    vi.useFakeTimers();
    render(<WordTowerMutatorBanner mutator={MUTATORS.tailwind} t={t} />);
    expect(screen.getByText('wordTower.mutator.tailwind.name')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('wordTower.mutator.tailwind.name')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no mutator', () => {
    const { container } = render(<WordTowerMutatorBanner mutator={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
