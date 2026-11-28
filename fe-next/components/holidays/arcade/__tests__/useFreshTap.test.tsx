import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFreshTap } from '../useFreshTap';

function Dialog({ onAgain }: { onAgain: () => void }) {
  const { surface, guard } = useFreshTap(450);
  return (
    <div {...surface}>
      <button type="button" onClick={guard(onAgain)}>
        again
      </button>
    </div>
  );
}

describe('useFreshTap', () => {
  it('Given a finger still down from the game, when it lifts on the results button, then nothing happens', () => {
    const onAgain = vi.fn();
    render(<Dialog onAgain={onAgain} />);
    fireEvent.click(screen.getByText('again'));
    expect(onAgain).not.toHaveBeenCalled();
  });

  it('Given a press that starts too soon after the screen opens, then it is ignored; a later fresh press works', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    const onAgain = vi.fn();
    render(<Dialog onAgain={onAgain} />);
    const btn = screen.getByText('again');
    now.mockReturnValue(1200);
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onAgain).not.toHaveBeenCalled();
    now.mockReturnValue(1600);
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onAgain).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1700);
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.click(btn);
    expect(onAgain).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});
