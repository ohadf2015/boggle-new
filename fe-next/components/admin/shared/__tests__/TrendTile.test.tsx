import { render, screen, fireEvent } from '@testing-library/react';
import { TrendTile } from '../TrendTile';

vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));

describe('TrendTile', () => {
  it('shows a number, its change in words and a trend line', () => {
    const { container } = render(<TrendTile testId="t" label="Games" value={42} deltaText="+50% vs before" deltaTone="up" spark={[1, 2, 3]} />);
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('t-delta').textContent).toBe('+50% vs before');
    expect(screen.getByTestId('t-delta').className).toContain('text-neo-lime');
    expect(container.querySelector('svg polyline')).not.toBeNull();
  });

  it('shows a string value as given and the no-data text for null', () => {
    const { rerender } = render(<TrendTile testId="t" label="Share" value="34%" />);
    expect(screen.getByText('34%')).toBeInTheDocument();
    rerender(<TrendTile testId="t" label="Share" value={null} noData="Not enough history yet." />);
    expect(screen.getByText('Not enough history yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('t-delta')).toBeNull();
  });

  it('a drill action and a whole-tile select are separate buttons', () => {
    const onSelect = vi.fn();
    const onClick = vi.fn();
    render(<TrendTile testId="t" label="Games" value={1} onSelect={onSelect} action={{ label: 'Show the list (3)', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show the list (3)' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Games'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('is not a button when nothing is selectable', () => {
    render(<TrendTile testId="t" label="Games" value={1} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
