// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCrosswordHardwareKeys } from '../useCrosswordHardwareKeys';

function actions() {
  return {
    backspace: vi.fn(),
    moveInSlot: vi.fn(),
    moveVertical: vi.fn(),
    inputLetter: vi.fn(),
    toggleDir: vi.fn(),
    nextSlot: vi.fn(),
  };
}

function imeInput(): HTMLInputElement {
  const el = document.createElement('input');
  el.dataset.crosswordIme = '';
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('useCrosswordHardwareKeys', () => {
  it('types a plain letter key', () => {
    const a = actions();
    renderHook(() => useCrosswordHardwareKeys(a, false));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(a.inputLetter).toHaveBeenCalledWith('a');
  });

  it('ignores keys while an IME is composing (Backspace edits the composition, not the grid)', () => {
    const a = actions();
    renderHook(() => useCrosswordHardwareKeys(a, false));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', isComposing: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', keyCode: 229 }));
    expect(a.backspace).not.toHaveBeenCalled();
    expect(a.inputLetter).not.toHaveBeenCalled();
  });

  it('still navigates and deletes while the crossword IME input has focus', () => {
    const a = actions();
    renderHook(() => useCrosswordHardwareKeys(a, false));
    const el = imeInput();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(a.backspace).toHaveBeenCalledTimes(1);
    expect(a.moveInSlot).toHaveBeenCalledWith(1);
  });

  it('leaves letters typed into the IME input to that input (no double entry)', () => {
    const a = actions();
    renderHook(() => useCrosswordHardwareKeys(a, false));
    imeInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'あ', bubbles: true }));
    expect(a.inputLetter).not.toHaveBeenCalled();
  });

  it('ignores every key typed into an ordinary text field', () => {
    const a = actions();
    renderHook(() => useCrosswordHardwareKeys(a, false));
    const el = document.createElement('input');
    document.body.appendChild(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(a.backspace).not.toHaveBeenCalled();
  });
});
