import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import WheelActionBar from '../WheelActionBar';

function setup() {
  const onBackspace = vi.fn();
  const onClear = vi.fn();
  render(
    <WheelActionBar
      t={(k) => k}
      hasLetters
      canSubmit
      isValidating={false}
      onClear={onClear}
      onSubmit={vi.fn()}
      onBackspace={onBackspace}
    />,
  );
  return { onBackspace, onClear, key: screen.getByRole('button', { name: 'wordWheel.removeLetter' }) };
}

describe('WheelActionBar backspace', () => {
  afterEach(() => vi.useRealTimers());

  it('Given letters in the tray, When backspace is held, Then the whole word clears and no letter is also removed', () => {
    vi.useFakeTimers();
    const { onBackspace, onClear, key } = setup();

    fireEvent.pointerDown(key);
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.click(key);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('Given letters in the tray, When backspace is tapped three times fast, Then "hold to clear" appears', () => {
    const { onBackspace, key } = setup();
    fireEvent.click(key);
    fireEvent.click(key);
    fireEvent.click(key);

    expect(onBackspace).toHaveBeenCalledTimes(3);
    expect(screen.getByText('common.holdToClear')).toBeTruthy();
  });
});
