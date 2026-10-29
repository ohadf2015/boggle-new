import './testT';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BlastLevelIntro } from '../BlastLevelIntro';
import { getWaveTheme } from '../waveTheme';
import { getWavePassPct } from '@/components/blast/legacy/utils/blastWaveTheme';

describe('BlastLevelIntro', () => {
  afterEach(() => vi.useRealTimers());

  it('names the wave theme, its one board-clear goal and its accent', () => {
    const theme = getWaveTheme(5);
    render(<BlastLevelIntro wave={5} durationMs={1000} />);
    const intro = screen.getByTestId('blast-level-intro');
    expect(intro).toHaveAttribute('data-theme', theme.id);
    expect(screen.getByText(theme.nameKey)).toBeInTheDocument();
    expect(screen.getByText(`blast.objective.clearPercent{"target":${getWavePassPct(5)}}`)).toBeInTheDocument();
    expect(screen.getByText('blastProgress.wave{"wave":5}')).toBeInTheDocument();
  });

  it('dismisses itself after its duration', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<BlastLevelIntro wave={2} durationMs={1000} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByTestId('blast-level-intro')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips on tap', () => {
    const onDone = vi.fn();
    render(<BlastLevelIntro wave={2} durationMs={5000} onDone={onDone} />);
    fireEvent.pointerDown(screen.getByTestId('blast-level-intro'));
    expect(screen.queryByTestId('blast-level-intro')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
