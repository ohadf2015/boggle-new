// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrosswordImeInput } from '../CrosswordImeInput';

function setPointerFine(fine: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: fine && q.includes('pointer: fine'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function ime(): HTMLInputElement {
  return screen.getByLabelText('kana input') as HTMLInputElement;
}

describe('CrosswordImeInput', () => {
  beforeEach(() => setPointerFine(true));

  it('feeds each kana an IME commits (compositionend) to the grid, one cell per character', () => {
    const onLetter = vi.fn();
    render(<CrosswordImeInput onLetter={onLetter} focusKey="0,0" label="kana input" />);
    const el = ime();
    fireEvent.compositionStart(el);
    fireEvent.change(el, { target: { value: 'ねこ' } });
    fireEvent.compositionEnd(el, { data: 'ねこ' });
    expect(onLetter.mock.calls.map((c) => c[0])).toEqual(['ね', 'こ']);
    expect(el.value).toBe('');
  });

  it('does not enter the commit twice when the browser also fires input after compositionend', () => {
    const onLetter = vi.fn();
    render(<CrosswordImeInput onLetter={onLetter} focusKey="0,0" label="kana input" />);
    const el = ime();
    fireEvent.compositionStart(el);
    el.value = 'やま';
    fireEvent.compositionEnd(el, { data: 'やま' });
    fireEvent.input(el, { data: 'やま' });
    expect(onLetter).toHaveBeenCalledTimes(2);
  });

  it('ignores input events while composing (the candidate is not final yet)', () => {
    const onLetter = vi.fn();
    render(<CrosswordImeInput onLetter={onLetter} focusKey="0,0" label="kana input" />);
    const el = ime();
    fireEvent.compositionStart(el);
    fireEvent.input(el, { target: { value: 'か' } });
    expect(onLetter).not.toHaveBeenCalled();
  });

  it('feeds direct (non-composed) input such as a kana-layout keyboard', () => {
    const onLetter = vi.fn();
    render(<CrosswordImeInput onLetter={onLetter} focusKey="0,0" label="kana input" />);
    fireEvent.input(ime(), { target: { value: 'あ' } });
    expect(onLetter).toHaveBeenCalledWith('あ');
    expect(ime().value).toBe('');
  });

  it('takes focus on a fine-pointer (desktop) device so the IME has somewhere to type', () => {
    render(<CrosswordImeInput onLetter={vi.fn()} focusKey="0,0" label="kana input" />);
    expect(document.activeElement).toBe(ime());
  });

  it('never takes focus on touch devices (no native keyboard over the kana keys)', () => {
    setPointerFine(false);
    render(<CrosswordImeInput onLetter={vi.fn()} focusKey="0,0" label="kana input" />);
    expect(document.activeElement).not.toBe(ime());
  });

  it('marks itself for the hardware-key hook and keeps the soft keyboard off', () => {
    render(<CrosswordImeInput onLetter={vi.fn()} focusKey="0,0" label="kana input" />);
    expect(ime().dataset.crosswordIme).toBeDefined();
    expect(ime().getAttribute('inputmode')).toBe('none');
  });
});
