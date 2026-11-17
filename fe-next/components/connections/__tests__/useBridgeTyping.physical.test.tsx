import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { createElement, useState } from 'react';
import { useBridgeTyping } from '../useBridgeTyping';

function Harness({ locale, answer, start = '', status = 'playing' }: { locale: string; answer: string; start?: string; status?: string }) {
  const [input, setInput] = useState(start);
  const { pressedKey } = useBridgeTyping({
    input,
    answer,
    locale,
    disabled: false,
    status,
    wrongAttempts: 0,
    onInputChange: setInput,
    onSubmit: () => {},
  });
  return createElement('div', null,
    createElement('output', { 'data-testid': 'buffer' }, input),
    createElement('output', { 'data-testid': 'pressed' }, pressedKey ?? ''),
  );
}

function keys(events: Array<[string, string]>) {
  act(() => {
    for (const [key, code] of events) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
    }
  });
}

describe('useBridgeTyping physical keyboard', () => {
  it('keeps every letter of a fast burst typed before React re-renders', () => {
    const { getByTestId } = render(createElement(Harness, { locale: 'en', answer: 'GREEN' }));
    keys([['g', 'KeyG'], ['r', 'KeyR'], ['e', 'KeyE'], ['e', 'KeyE'], ['n', 'KeyN']]);
    expect(getByTestId('buffer').textContent).toBe('GREEN');
  });

  it('keeps a backspace inside a burst', () => {
    const { getByTestId } = render(createElement(Harness, { locale: 'en', answer: 'GREEN' }));
    keys([['g', 'KeyG'], ['x', 'KeyX'], ['Backspace', 'Backspace'], ['r', 'KeyR']]);
    expect(getByTestId('buffer').textContent).toBe('GR');
  });

  it('types Hebrew letters on a Hebrew board when the OS layout is English', () => {
    const { getByTestId } = render(createElement(Harness, { locale: 'he', answer: 'שלום' }));
    keys([['a', 'KeyA'], ['k', 'KeyK']]);
    expect(getByTestId('buffer').textContent).toBe('של');
  });

  it('reports the pressed key so the on-screen key can echo it', () => {
    const { getByTestId } = render(createElement(Harness, { locale: 'en', answer: 'GREEN' }));
    keys([['g', 'KeyG']]);
    expect(getByTestId('pressed').textContent).toBe('G');
  });

  it('starts a fresh guess when typing resumes before a wrong guess clears itself', () => {
    const { getByTestId } = render(createElement(Harness, { locale: 'en', answer: 'GREEN', start: 'GRXEN', status: 'wrong' }));
    keys([['b', 'KeyB'], ['r', 'KeyR']]);
    expect(getByTestId('buffer').textContent).toBe('BR');
  });
});
