import React, { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { render, screen } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';

/**
 * t_55afcea2 — production incident: the Word Bridge daily keyboard was caught
 * in two broken states on the live site: (a) an empty container — the rows
 * sit at `opacity: 0` from the m.div entrance until hydration runs, which is
 * SECONDS on a slow connection (measured 0-4s under 400ms latency / 6x CPU),
 * and (b) letter keys crushed to their 6px borders — the signature of a
 * transient over-subscribed flex row (min-w-0 lets shrink go to zero).
 *
 * These tests pin the two hardening properties checkable in a DOM env:
 *  1. Every letter key carries a min-width floor so flex-shrink can never
 *     crush it below a tappable size, no matter how over-subscribed the row.
 *  2. SSR markup hydrates cleanly: no React hydration errors and the row
 *     structure (10/9/9 incl. action keys) survives hydration intact — a row
 *     holding all 28 buttons is the corruption signature and must not recur.
 *
 * The third property — served markup never hides the keyboard behind
 * `opacity: 0` — lives in ConnectionsKeyboard.ssr.test.tsx, which runs in the
 * node environment because framer-motion only writes `initial` styles into
 * SSR markup when `window` is undefined.
 */

const baseProps = {
  onLetter: () => {},
  onBackspace: () => {},
  onSubmit: () => {},
  backspaceLabel: 'Delete letter',
  submitLabel: 'Submit',
};

describe('ConnectionsKeyboard — t_55afcea2 hardening', () => {

  it('every letter key carries a min-width floor across all locales (shrink can never crush to 6px)', () => {
    for (const locale of ['en', 'he', 'ru']) {
      const rows = getKeyboardRows(locale);
      const { unmount } = render(<ConnectionsKeyboard {...baseProps} rows={rows} canSubmit />);
      for (const letter of rows.flat()) {
        const key = screen.getByRole('button', { name: letter });
        // 0.875rem = 14px — never binds in a healthy layout (a 12-key Russian
        // row on a 280px Fold still computes above it) but stops flex-shrink
        // before a key reaches its 6px borders.
        expect(key.style.minWidth).toBe('0.875rem');
        expect(key.style.flexShrink).toBe('1');
      }
      unmount();
    }
  });

  it('hydrates the SSR markup with no errors and keeps the 10/9/9 row structure', async () => {
    const rows = getKeyboardRows('en');
    const tree = (
      <LazyMotion features={domMax}>
        <ConnectionsKeyboard {...baseProps} rows={rows} canSubmit />
      </LazyMotion>
    );
    const html = renderToString(tree);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);

    const consoleErrors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(' '));
    });
    try {
      await act(async () => {
        hydrateRoot(host, tree);
      });
    } finally {
      spy.mockRestore();
      host.remove();
    }

    expect(consoleErrors.filter((e) => /hydrat/i.test(e))).toEqual([]);
    // The corruption signature from production was rows holding 0 / 28 / 1
    // buttons. The healthy shape is 10 / 9 / 7+2 action keys.
    const keyboardRoot = host.firstElementChild as HTMLElement;
    const rowEls = [...keyboardRoot.children];
    expect(rowEls.map((r) => r.querySelectorAll('button').length)).toEqual([10, 9, 9]);
  });
});
