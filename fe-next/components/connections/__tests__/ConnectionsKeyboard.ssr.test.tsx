import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';

/**
 * t_55afcea2 — the production SSR markup for the daily keyboard served every
 * row as `style="opacity:0;transform:translateY(10px)"` (verified by curling
 * https://www.lexiclash.live/en/connections/daily): the keyboard is INVISIBLE
 * until JS hydrates and plays the entrance — seconds on a slow connection,
 * forever if the JS chunk 404s mid-deploy. That's the "empty container"
 * broken state caught on the live site.
 *
 * The rule (same lesson as PuzzleCard's entrance, documented in that file):
 * a primary-input entrance may MOVE (transform) but must never HIDE (opacity).
 *
 * framer-motion's SSR style emission can't be reproduced faithfully in vitest
 * (in the node env `m` leaks motion props as attributes instead of computing
 * visual state), so this test mocks framer-motion and asserts the component
 * contract directly: no entrance prop may contain `opacity`.
 */

interface EntranceProps {
  initial?: Record<string, unknown> | false;
  animate?: Record<string, unknown>;
}

const capturedEntrances: EntranceProps[] = [];

vi.mock('framer-motion', () => ({
  // `m.div` — capture the animation props, render a plain div.
  m: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, initial, animate, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
          capturedEntrances.push({ initial: initial as EntranceProps['initial'], animate: animate as EntranceProps['animate'] });
          return <div {...(rest as Record<string, unknown>)}>{children}</div>;
        },
    },
  ),
  LazyMotion: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  domMax: {},
}));

const baseProps = {
  onLetter: () => {},
  onBackspace: () => {},
  onSubmit: () => {},
  backspaceLabel: 'Delete letter',
  submitLabel: 'Submit',
};

describe('ConnectionsKeyboard entrance — visibility never depends on JS (t_55afcea2)', () => {
  beforeEach(() => {
    capturedEntrances.length = 0;
  });

  it('no row entrance hides the keyboard (no opacity in initial/animate)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    expect(capturedEntrances.length).toBe(3); // one entrance per keyboard row
    for (const { initial, animate } of capturedEntrances) {
      expect(initial === false || !Object.prototype.hasOwnProperty.call(initial ?? {}, 'opacity')).toBe(true);
      expect(!Object.prototype.hasOwnProperty.call(animate ?? {}, 'opacity')).toBe(true);
    }
    // Keys still render and are immediately interactive.
    expect(screen.getByRole('button', { name: 'Q' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Z' })).toBeTruthy();
  });
});
