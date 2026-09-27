import { describe, it, expect, afterEach } from 'vitest';
import { isTypingTarget } from '../isTypingTarget';

function dispatchKeydownFrom(el: Element): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'a',
    bubbles: true,
    composed: true, // how a real key event crosses a shadow boundary
  });
  el.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isTypingTarget', () => {
  it('is true for a textarea in the light DOM', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);

    let seen: boolean | null = null;
    const onKey = (e: Event) => {
      seen = isTypingTarget(e);
    };
    window.addEventListener('keydown', onKey);
    dispatchKeydownFrom(ta);
    window.removeEventListener('keydown', onKey);

    expect(seen).toBe(true);
  });

  it('is true for a textarea inside a shadow root, where event.target is the host', () => {
    // This is the feedback-devtools widget: it renders its form into an open
    // shadow root, so by the time the keydown reaches window the browser has
    // retargeted the event to the host <div>. A tagName check on event.target
    // reads DIV and wrongly concludes the user is not typing.
    //
    // jsdom does not implement retargeting (it leaves target as the textarea),
    // so the browser-shaped event is built explicitly: target = host,
    // composedPath()[0] = the textarea the user is actually typing in.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const ta = document.createElement('textarea');
    shadow.appendChild(ta);

    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, composed: true });
    Object.defineProperty(event, 'target', { value: host });
    Object.defineProperty(event, 'composedPath', { value: () => [ta, shadow, host, document.body, window] });

    expect((event.target as HTMLElement).tagName).toBe('DIV'); // the trap this helper exists for
    expect(isTypingTarget(event)).toBe(true);
  });

  it('is false for an ordinary element, so game keyboard input still works', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    let seen: boolean | null = null;
    const onKey = (e: Event) => {
      seen = isTypingTarget(e);
    };
    window.addEventListener('keydown', onKey);
    dispatchKeydownFrom(div);
    window.removeEventListener('keydown', onKey);

    expect(seen).toBe(false);
  });

  it('is true for a contentEditable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    Object.defineProperty(div, 'isContentEditable', { value: true });

    let seen: boolean | null = null;
    const onKey = (e: Event) => {
      seen = isTypingTarget(e);
    };
    window.addEventListener('keydown', onKey);
    dispatchKeydownFrom(div);
    window.removeEventListener('keydown', onKey);

    expect(seen).toBe(true);
  });
});
