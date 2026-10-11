/** Keeps a wheel press from starting a text selection or a native drag, which would swallow the swipe. */
export function claimPointer(e: { preventDefault: () => void }): void {
  e.preventDefault();
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (sel && sel.rangeCount > 0) sel.removeAllRanges();
}
