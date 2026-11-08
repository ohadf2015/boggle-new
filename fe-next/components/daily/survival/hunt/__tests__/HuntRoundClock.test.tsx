import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuntRoundClock } from '../HuntRoundClock';

describe('HuntRoundClock', () => {
  it('shows the time left and a bar that shrinks with it', () => {
    render(<HuntRoundClock remaining={45} total={60} label="Time" />);
    expect(screen.getByTestId('hunt-round-clock-value').textContent).toBe('0:45');
    expect(screen.getByTestId('hunt-round-clock-bar').style.transform).toBe('scaleX(0.75)');
    expect(screen.getByTestId('hunt-round-clock').dataset.urgent).toBe('false');
    expect(screen.getByRole('timer', { name: 'Time' })).toBeTruthy();
  });

  it('turns urgent in the last ten seconds', () => {
    render(<HuntRoundClock remaining={9} total={60} label="Time" />);
    expect(screen.getByTestId('hunt-round-clock').dataset.urgent).toBe('true');
  });
});
