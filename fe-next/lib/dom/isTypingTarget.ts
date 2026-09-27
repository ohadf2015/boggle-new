/**
 * True when the keystroke is being typed into a text field.
 *
 * Must be used instead of reading `event.target.tagName` directly: an event that
 * originates inside a shadow root is retargeted by the time it reaches
 * `window`/`document`, so `event.target` is the shadow HOST element, not the
 * `<textarea>` the user is typing in. The feedback-devtools widget renders into
 * an open shadow root, so a `tagName`-based guard reads `DIV`, decides the user
 * is not typing, and lets the game's keyboard handler `preventDefault()` every
 * printable character — the bug report can never be written.
 *
 * `composedPath()[0]` is the real innermost target and pierces the shadow
 * boundary. Falls back to `event.target` where composedPath is unavailable.
 */
function asElement(node: unknown): HTMLElement | null {
  return node && typeof (node as HTMLElement).tagName === 'string' ? (node as HTMLElement) : null;
}

export function isTypingTarget(event: Event): boolean {
  // composedPath()[0] is the innermost target and pierces the shadow boundary.
  // It can start at `window`/`document` (a synthetic event dispatched on window),
  // so take the first real element and fall back to `target` when there is none.
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const el = path.map(asElement).find(Boolean) ?? asElement(event.target);
  if (!el) return false;

  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
}
