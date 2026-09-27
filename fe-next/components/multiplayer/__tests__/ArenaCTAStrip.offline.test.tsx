import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const networkState = { online: true, slow: false, type: 'wifi' as const, rttMs: 20 };

vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: () => networkState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => null }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, whileHover, whileTap, variants, initial, animate, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(tag, props, children as React.ReactNode),
  }),
}));

import ArenaCTAStrip from '../ArenaCTAStrip';

/**
 * A replayed session showed the app rendering an "Offline" badge while BOTH
 * arena CTAs stayed bright, enabled and inviting — the player clicked a button
 * the app already knew could not work, then rage-clicked and left.
 * See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */
describe('ArenaCTAStrip when the connection is unusable', () => {
  const onQuickPlay = vi.fn();
  const onCreateRoom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    networkState.online = true;
  });

  const renderStrip = () =>
    render(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={onCreateRoom} />);

  it('offers both CTAs normally when online and connected', () => {
    renderStrip();
    expect(screen.getByTestId('arena-quick-start')).not.toBeDisabled();
    expect(screen.getByTestId('arena-create-room')).not.toBeDisabled();
  });

  it('disables both CTAs when the device is offline', () => {
    networkState.online = false;
    renderStrip();

    expect(screen.getByTestId('arena-quick-start')).toBeDisabled();
    expect(screen.getByTestId('arena-create-room')).toBeDisabled();
  });

  it('says it is reconnecting instead of inviting a tap that cannot work', () => {
    networkState.online = false;
    renderStrip();

    expect(screen.getByTestId('arena-quick-start').textContent).toContain('mp.quality.reconnecting');
    expect(screen.getByTestId('arena-quick-start').textContent).not.toContain('roomList.quickStart');
  });

  it('swallows the click rather than firing a join that will fail', () => {
    networkState.online = false;
    renderStrip();

    fireEvent.click(screen.getByTestId('arena-quick-start'));
    fireEvent.click(screen.getByTestId('arena-create-room'));

    expect(onQuickPlay).not.toHaveBeenCalled();
    expect(onCreateRoom).not.toHaveBeenCalled();
  });

  it('recovers the normal label once the connection returns', () => {
    const { rerender } = renderStrip();
    networkState.online = false;
    rerender(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={onCreateRoom} />);
    expect(screen.getByTestId('arena-quick-start')).toBeDisabled();

    networkState.online = true;
    rerender(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={onCreateRoom} />);
    expect(screen.getByTestId('arena-quick-start')).not.toBeDisabled();
    expect(screen.getByTestId('arena-quick-start').textContent).toContain('roomList.quickStart');
  });
});
