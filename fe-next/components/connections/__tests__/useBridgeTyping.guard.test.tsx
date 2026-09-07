/**
 * useBridgeTyping — "am I typing somewhere else?" guard.
 *
 * Regression test for the connections flavor of issue #840: the hook's window
 * keydown listener had no typing-target guard, so with a game mounted every
 * printable keystroke aimed at ANY text field on the page (feedback widget,
 * chat, settings inputs) was preventDefault'd and fed into the guess buffer
 * instead — and Backspace was hijacked too. All eight OTHER game keyboard
 * handlers in the repo were routed through lib/dom/isTypingTarget.ts in #840;
 * useBridgeTyping was the one missed.
 *
 * The hard case is a shadow root: keydown is retargeted before it reaches
 * window, so event.target is the shadow HOST, not the inner <textarea>. A
 * tagName-based guard reads DIV and swallows the keystroke anyway — the guard
 * must use composedPath()[0] (what isTypingTarget does).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { createElement } from 'react';
import { useBridgeTyping } from '../useBridgeTyping';

interface HarnessProps {
  onInputChange: (v: string) => void;
  onSubmit: () => void;
}

function Harness({ onInputChange, onSubmit }: HarnessProps) {
  const { handleLetter, handleBackspace } = useBridgeTyping({
    input: '',
    answer: 'WORM',
    locale: 'en',
    disabled: false,
    status: 'playing',
    wrongAttempts: 0,
    onInputChange,
    onSubmit,
  });
  return createElement('div', null,
    createElement('input', { 'data-testid': 'side-input', 'aria-label': 'side input' }),
    createElement('button', { 'data-testid': 'onscreen-key', onClick: () => handleLetter('W') }, 'W'),
    createElement('button', { 'data-testid': 'onscreen-backspace', onClick: () => handleBackspace() }, '⌫'),
  );
}

describe('useBridgeTyping typing-target guard', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores printable keystrokes aimed at a focused text input', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const { getByTestId } = render(createElement(Harness, { onInputChange, onSubmit }));
    const input = getByTestId('side-input') as HTMLInputElement;
    input.focus();

    // A real keystroke targets the INPUT and bubbles up to the window listener
    // — dispatching on window would make composedPath()[0] === window, which is
    // not what a browser does for a typed character.
    fireEvent.keyDown(input, { key: 'W' });
    fireEvent.keyDown(input, { key: 'O' });

    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('does not hijack Backspace while a text input is focused', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const { getByTestId } = render(createElement(Harness, { onInputChange, onSubmit }));
    const input = getByTestId('side-input') as HTMLInputElement;
    input.focus();

    // Targeted at the input, bubbles to window — the game must leave it alone.
    const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true, bubbles: true });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('recognizes typing inside an open shadow root (retargeted target)', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(createElement(Harness, { onInputChange, onSubmit }));

    // Build the feedback-devtools shape: textarea inside an open shadow root.
    const host = document.createElement('div');
    container.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const textarea = document.createElement('textarea');
    shadow.appendChild(textarea);

    // A real dispatched event retargets: window sees target === host DIV,
    // composedPath()[0] === textarea. jsdom implements composedPath for
    // shadow-DOM-dispatched events.
    const event = new KeyboardEvent('keydown', { key: 'W', cancelable: true, composed: true, bubbles: true });
    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('still types into the guess buffer when no text field is focused', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    render(createElement(Harness, { onInputChange, onSubmit }));

    fireEvent.keyDown(window, { key: 'W' });
    expect(onInputChange).toHaveBeenCalledWith('W');
  });

  it('on-screen keys keep working regardless of focus', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const { getByTestId } = render(createElement(Harness, { onInputChange, onSubmit }));
    const input = getByTestId('side-input') as HTMLInputElement;
    input.focus();

    act(() => {
      getByTestId('onscreen-key').click();
    });
    expect(onInputChange).toHaveBeenCalledWith('W');

    act(() => {
      getByTestId('onscreen-backspace').click();
    });
    expect(onInputChange).toHaveBeenCalledWith('');
  });
});
