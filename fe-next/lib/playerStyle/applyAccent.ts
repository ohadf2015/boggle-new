import { pickAccentForeground } from './accentForeground';

/** The CSS custom property the player accent overrides. Defined in globals.css. */
export const ACCENT_VAR = '--accent';
/** Companion var holding a readable text/icon color for `bg-accent` surfaces. */
export const ACCENT_FOREGROUND_VAR = '--accent-foreground';

/**
 * Apply (or clear) the player accent on a DOM element's inline style.
 *
 * Sets BOTH `--accent` (the color) and `--accent-foreground` (a WCAG-derived
 * black/white that stays legible on top of it) so every `bg-accent
 * text-accent-foreground` surface reskins safely.
 *
 * `null` REMOVES both overrides so the values cascade back to the globals.css
 * defaults (lime + black) — this is what makes the "default" style a true
 * no-change experience. SSR-safe: a null element is a no-op.
 */
export function applyAccentVar(
  el: HTMLElement | null,
  hex: string | null,
): void {
  if (!el) return;
  if (hex) {
    el.style.setProperty(ACCENT_VAR, hex);
    el.style.setProperty(ACCENT_FOREGROUND_VAR, pickAccentForeground(hex));
  } else {
    el.style.removeProperty(ACCENT_VAR);
    el.style.removeProperty(ACCENT_FOREGROUND_VAR);
  }
}
