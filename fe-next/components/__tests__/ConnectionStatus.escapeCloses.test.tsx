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

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ isConnected: true, isReconnecting: false, connectionError: null }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { ConnectionStatus } from '../ConnectionStatusIndicator';

describe('ConnectionStatus — Escape closes the focus-triggered tooltip', () => {
  it('closes the tooltip when Escape is pressed while it is focused/visible', async () => {
    render(<ConnectionStatus />);
    const trigger = screen.getByRole('status');

    fireEvent.focus(trigger);
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument());

    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
