import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => (props: React.PropsWithChildren<Record<string, unknown>>) => {
      const { children, ...rest } = props;
      const safe: Record<string, unknown> = {};
      Object.keys(rest).forEach((k) => {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(k)) {
          safe[k] = (rest as Record<string, unknown>)[k];
        }
      });
      return React.createElement('div', safe, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import PresenceIndicator from '../PresenceIndicator';

describe('PresenceIndicator — Escape closes the tap-triggered tooltip', () => {
  it('closes the tooltip when Escape is pressed while it is visible', async () => {
    const { container } = render(<PresenceIndicator status="active" />);

    // Tap to open (the outer container has the click handler).
    const trigger = container.querySelector('.cursor-pointer') as HTMLElement;
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText('presence.active')).toBeInTheDocument());

    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('presence.active')).not.toBeInTheDocument());
  });
});
