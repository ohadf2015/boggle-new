import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WordCraftHandoff } from '../WordCraftHandoff';

const labels = {
  passTo: 'Pass the device to {name}',
  tapReady: 'Their rack is hidden until they start',
  start: 'Start turn',
};

describe('WordCraftHandoff', () => {
  it('names the incoming player so the device knows who is up', () => {
    render(<WordCraftHandoff incomingName="Player 2" onReady={() => {}} labels={labels} />);
    expect(screen.getByText('Pass the device to Player 2')).toBeTruthy();
  });

  it('calls onReady when the incoming player starts their turn', () => {
    const onReady = vi.fn();
    render(<WordCraftHandoff incomingName="Player 1" onReady={onReady} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start turn' }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('is a blocking overlay (dialog) so the previous rack stays hidden', () => {
    render(<WordCraftHandoff incomingName="Player 2" onReady={() => {}} labels={labels} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
