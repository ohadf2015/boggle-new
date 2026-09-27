import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImeText } from './useImeText';

/**
 * Minimal harness exercising the hook on a real <input> + submit button,
 * mirroring how the party-game / duel call sites wire it.
 */
function Harness({ maxLength, onSubmit }: { maxLength?: number; onSubmit: (v: string) => void }) {
  const { inputProps, isEmpty, getValue, reset } = useImeText<HTMLInputElement>({ maxLength });
  return (
    <div>
      <input {...inputProps} aria-label="field" />
      <button
        aria-label="submit"
        aria-disabled={isEmpty}
        onClick={() => {
          const v = getValue();
          if (!v) return;
          onSubmit(v);
          reset();
        }}
      >
        send
      </button>
    </div>
  );
}

describe('useImeText — Hebrew/IME composition resilience', () => {
  it('syncs state after compositionEnd (Android GBoard Hebrew) and enables submit', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('field') as HTMLInputElement;
    const button = screen.getByLabelText('submit');

    // Initially empty -> button aria-disabled
    expect(button).toHaveAttribute('aria-disabled', 'true');

    // Android Hebrew: composition buffers into the DOM value, onChange may not fire
    fireEvent.compositionStart(input);
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'שלום' });
    fireEvent.compositionEnd(input, { data: 'שלום' });

    expect(button).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith('שלום');
  });

  it('reads DOM value on submit even when only onInput fired (no compositionEnd)', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('field') as HTMLInputElement;
    const button = screen.getByLabelText('submit');

    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'מה קורה' });
    fireEvent.input(input);

    expect(button).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith('מה קורה');
  });

  it('sends trimmed value via the DOM fallback even if React state is stale/empty', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('field') as HTMLInputElement;
    const button = screen.getByLabelText('submit');

    // Simulate the worst case: DOM has text but NO React-syncing event fired.
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: '  בדיקה  ' });

    // getValue() must read the DOM and trim, regardless of stale state.
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith('בדיקה');
  });

  it('truncates to maxLength on every input path', () => {
    const onSubmit = vi.fn();
    render(<Harness maxLength={5} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('field') as HTMLInputElement;
    const button = screen.getByLabelText('submit');

    fireEvent.change(input, { target: { value: 'abcdefghij' } });
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith('abcde');
  });

  it('does not submit when value is whitespace-only', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('field') as HTMLInputElement;
    const button = screen.getByLabelText('submit');

    fireEvent.change(input, { target: { value: '   ' } });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
