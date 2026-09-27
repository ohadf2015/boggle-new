import type { CSSProperties } from 'react';

/**
 * Style applied to react-hot-toast's default toasts via `<Toaster toastOptions>`.
 *
 * Uses the theme-paired `--popover` / `--popover-foreground` tokens rather than a
 * hardcoded white text colour. The codebase maintains this pair per theme:
 *   - dark (`:root`): popover = neo-gray (#32324d), foreground = white  ← unchanged
 *   - `.light`:        popover = #ffffff,            foreground = black
 *   - cosy:            popover = cream,              foreground = black
 *
 * The previous hardcoded `color: rgb(var(--neo-white))` rendered white text on the
 * `.light`/cosy themes where `--neo-gray` is near-white → invisible message, only
 * the spinner visible ("stuck empty toast"). The popover pair keeps every default
 * toast legible on every theme, with zero change to the default dark theme.
 */
export const globalToastStyle: CSSProperties = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  pointerEvents: 'auto',
};
