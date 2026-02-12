import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...rest }: any, ref: any) => (
      <div ref={ref} {...rest}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { BlastWaveTransition } from '../BlastWaveTransition';

describe('BlastWaveTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the wave number', () => {
    render(
      <BlastWaveTransition
        waveNumber={3}
        previousWaveScore={45}
        previousWaveWords={8}
        previousClearPercentage={67}
        onAdvance={jest.fn()}
      />
    );

    expect(screen.getByText(/WAVE 3/i)).toBeInTheDocument();
  });

  it('renders previous wave stats', () => {
    render(
      <BlastWaveTransition
        waveNumber={2}
        previousWaveScore={45}
        previousWaveWords={8}
        previousClearPercentage={67}
        onAdvance={jest.fn()}
      />
    );

    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
    expect(screen.getByText(/67%/)).toBeInTheDocument();
  });

  it('auto-advances after 2.5 seconds', () => {
    const onAdvance = jest.fn();

    render(
      <BlastWaveTransition
        waveNumber={2}
        previousWaveScore={30}
        previousWaveWords={5}
        previousClearPercentage={100}
        onAdvance={onAdvance}
      />
    );

    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('calls onAdvance when clicked', () => {
    const onAdvance = jest.fn();

    render(
      <BlastWaveTransition
        waveNumber={2}
        previousWaveScore={30}
        previousWaveWords={5}
        previousClearPercentage={100}
        onAdvance={onAdvance}
      />
    );

    const overlay = screen.getByTestId('wave-transition-overlay');
    overlay.click();

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
