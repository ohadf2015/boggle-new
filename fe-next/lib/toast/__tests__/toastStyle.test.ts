import { describe, it, expect } from 'vitest';
import { globalToastStyle } from '../toastStyle';

/**
 * RED: the global <Toaster> hardcoded `color: rgb(var(--neo-white))` (white). On
 * the `.light` / cosy themes `--neo-gray` is near-white, so the default toasts
 * rendered white-on-near-white — the message vanished and only the spinner showed
 * ("stuck empty toast"). Foreground/background must follow the theme-paired
 * popover tokens, which the theme CSS maintains for every theme.
 */
describe('globalToastStyle — legible on every theme', () => {
  it('uses theme-paired popover tokens, never a hardcoded white text colour', () => {
    expect(globalToastStyle.background).toBe('var(--popover)');
    expect(globalToastStyle.color).toBe('var(--popover-foreground)');
    // explicitly guard against regressing to white-on-near-white
    expect(String(globalToastStyle.color)).not.toMatch(/neo-white|255 255 255|#fff|\bwhite\b/i);
  });

  it('keeps toasts interactive above the pointer-events:none container', () => {
    expect(globalToastStyle.pointerEvents).toBe('auto');
  });
});
