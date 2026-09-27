import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useKeyboardWordInput } from '../useKeyboardWordInput';

/**
 * The feedback-devtools widget renders its report form into an open shadow root
 * (`<div id="fdw-root">` on lexiclash.live). A keydown from inside that shadow
 * root is retargeted before it reaches window, so `event.target` is the host DIV
 * while `composedPath()[0]` is the real `<textarea>`.
 *
 * The old guard read `event.target.tagName`, saw DIV, decided the user was not
 * typing, and called preventDefault() on every printable character — a player
 * with a game on screen could not write a bug report at all.
 */
function retargetedKeydown(key: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const textarea = document.createElement('textarea');
  shadow.appendChild(textarea);

  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  // jsdom does not retarget, so shape the event the way Chrome delivers it.
  Object.defineProperty(event, 'target', { value: host });
  Object.defineProperty(event, 'composedPath', {
    value: () => [textarea, shadow, host, document.body, document.documentElement, document, window],
  });
  return event;
}

function plainKeydown(key: string) {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}

const OPTIONS = {
  grid: [['C', 'A', 'T'], ['S', 'A', 'T']] as any,
  language: 'en' as const,
  enabled: true,
  onWordSubmit: () => {},
  minWordLength: 2,
};

describe('useKeyboardWordInput with a shadow-DOM text field on the page', () => {
  it('leaves keystrokes typed into a shadow-root textarea alone', () => {
    const { result } = renderHook(() => useKeyboardWordInput(OPTIONS));

    const hebrew = retargetedKeydown('ש');
    const latin = retargetedKeydown('a');
    act(() => {
      window.dispatchEvent(hebrew);
      window.dispatchEvent(latin);
    });

    expect(hebrew.defaultPrevented).toBe(false);
    expect(latin.defaultPrevented).toBe(false);
    expect(result.current.typedWord).toBe('');
  });

  it('still consumes keystrokes aimed at the game itself', () => {
    const { result } = renderHook(() => useKeyboardWordInput(OPTIONS));

    const key = plainKeydown('c');
    act(() => {
      window.dispatchEvent(key);
    });

    expect(key.defaultPrevented).toBe(true);
    expect(result.current.typedWord).toBe('C');
  });
});
