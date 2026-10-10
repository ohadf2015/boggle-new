import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShellClock } from '../ShellClock';

const t = (key: string) => key;

describe('ShellClock', () => {
  it('given time left, then it shows the clock and drains the bar by the share remaining', () => {
    render(<ShellClock t={t} remaining={45} total={60} />);
    expect(screen.getByTestId('shell-clock-value').textContent).toBe('0:45');
    expect(screen.getByTestId('shell-clock-bar').style.transform).toBe('scaleX(0.75)');
    expect(screen.getByTestId('shell-clock').getAttribute('data-urgent')).toBe('false');
  });

  it('given the last ten seconds, then the clock turns urgent', () => {
    render(<ShellClock t={t} remaining={9} total={60} />);
    expect(screen.getByTestId('shell-clock').getAttribute('data-urgent')).toBe('true');
  });

  it('given a zero-length round, then the bar never divides by zero', () => {
    render(<ShellClock t={t} remaining={0} total={0} />);
    expect(screen.getByTestId('shell-clock-bar').style.transform).toBe('scaleX(0)');
  });
});
