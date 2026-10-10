import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurvivalLifeBar } from '../SurvivalLifeBar';

describe('SurvivalLifeBar life gain', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets the bar itself show the gain, with no floating badge repeating the stage payout', () => {
    const onDone = vi.fn();
    render(
      <SurvivalLifeBar lifePoints={80} isGameOver={false} isLifeGaining lifeGainAmount={12} skipAnimations={false} onLifeGainComplete={onDone} />,
    );
    expect(screen.queryByText('+12')).toBeNull();
    act(() => { vi.advanceTimersByTime(800); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not clear anything when no life was gained', () => {
    const onDone = vi.fn();
    render(
      <SurvivalLifeBar lifePoints={80} isGameOver={false} isLifeGaining={false} lifeGainAmount={null} skipAnimations={false} onLifeGainComplete={onDone} />,
    );
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).not.toHaveBeenCalled();
  });
});
