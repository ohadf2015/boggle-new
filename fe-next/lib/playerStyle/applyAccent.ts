/** The CSS custom property the player accent overrides. Defined in globals.css. */
export const ACCENT_VAR = '--accent';

/**
 * Apply (or clear) the player accent on a DOM element's inline style.
 *
 * `null` REMOVES the override so the value cascades back to the globals.css
 * default — this is what makes the "default" style a true no-change experience.
 * SSR-safe: a null element is a no-op.
 */
export function applyAccentVar(
  el: HTMLElement | null,
  hex: string | null,
): void {
  if (!el) return;
  if (hex) {
    el.style.setProperty(ACCENT_VAR, hex);
  } else {
    el.style.removeProperty(ACCENT_VAR);
  }
}
