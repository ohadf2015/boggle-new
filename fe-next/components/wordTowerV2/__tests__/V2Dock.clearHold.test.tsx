import { createRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { V2Dock, CLEAR_WORD_HOLD_MS } from '../V2Dock';

function renderDock(over: Partial<Parameters<typeof V2Dock>[0]> = {}) {
  const onBackspace = vi.fn();
  const onClearWord = vi.fn();
  const onPutBack = vi.fn();
  const utils = render(
    <V2Dock
      t={(k) => k}
      dockRef={createRef<HTMLDivElement>()}
      wide={false}
      dir="ltr"
      swinging={false}
      composing
      rejected={null}
      dictError={false}
      scrambles={3}
      wheel={['A', 'B', 'C', 'D', 'E', 'F']}
      selected={[0, 1, 2]}
      word="ABC"
      valid={false}
      intensity={0}
      accentHex="#c4f000"
      reducedMotion
      canPutBack={false}
      onScramble={vi.fn()}
      onSelectTile={vi.fn()}
      onDeselectTile={vi.fn()}
      onSubmit={vi.fn()}
      onDrop={vi.fn()}
      onPutBack={onPutBack}
      onBackspace={onBackspace}
      onClearWord={onClearWord}
      {...over}
    />,
  );
  const btn = utils.getByLabelText('wordTower.hud.backspace');
  return { btn, onBackspace, onClearWord, onPutBack };
}

afterEach(() => vi.useRealTimers());

describe('V2Dock backspace', () => {
  it('a quick tap rubs out one letter', () => {
    const { btn, onBackspace, onClearWord } = renderDock();
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onClearWord).not.toHaveBeenCalled();
  });

  it('holding clears the whole word, and the release click does not also delete a letter', () => {
    vi.useFakeTimers();
    const { btn, onBackspace, onClearWord } = renderDock();
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(CLEAR_WORD_HOLD_MS + 10); });
    expect(onClearWord).toHaveBeenCalledTimes(1);
    fireEvent.click(btn);
    expect(onBackspace).not.toHaveBeenCalled();
    // The next plain tap works normally again.
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });
});
