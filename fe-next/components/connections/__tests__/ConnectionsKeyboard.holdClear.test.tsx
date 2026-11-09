import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';
import { CLEAR_HOLD_MS } from '@/hooks/useHoldToClear';

describe('ConnectionsKeyboard backspace hold', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup() {
    const onBackspace = vi.fn(); const onClear = vi.fn();
    render(
      <ConnectionsKeyboard
        rows={getKeyboardRows('he')} onLetter={() => {}} onSubmit={() => {}}
        onBackspace={onBackspace} onClear={onClear} backspaceLabel="מחיקת אות" submitLabel="שלח"
      />,
    );
    return { key: screen.getByRole('button', { name: 'מחיקת אות' }), onBackspace, onClear };
  }

  it('tap removes one letter', () => {
    const { key, onBackspace, onClear } = setup();
    fireEvent.pointerDown(key);
    fireEvent.click(key);
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('hold clears the whole guess', () => {
    const { key, onBackspace, onClear } = setup();
    fireEvent.pointerDown(key);
    act(() => { vi.advanceTimersByTime(CLEAR_HOLD_MS + 10); });
    fireEvent.click(key);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onBackspace).not.toHaveBeenCalled();
  });
});
