/**
 * FOUNDATION screen stubs: the frozen routers (HostView, PlayerView,
 * MpPhaseRouter) render these; each piece owns and redesigns its stub.
 * Today each wraps the existing view in the no-scroll MP frame.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HostLobbyScreen } from '../lobby/HostLobbyScreen';
import { PlayerLobbyScreen } from '../lobby/PlayerLobbyScreen';
import { MpRoundScreen } from '../round/MpRoundScreen';
import { MpCountdown } from '../round/MpCountdown';

describe('MP screen stubs', () => {
  it.each([
    ['mp-host-lobby', HostLobbyScreen],
    ['mp-player-lobby', PlayerLobbyScreen],
    ['mp-round', MpRoundScreen],
  ] as const)('%s renders its view inside an MpScreen frame', (testId, Stub) => {
    render(<Stub><div data-testid="view" /></Stub>);
    const frame = screen.getByTestId(testId);
    expect(frame.hasAttribute('data-mp-screen')).toBe(true);
    expect(frame.contains(screen.getByTestId('view'))).toBe(true);
  });

  it('lobbies scroll inside the body, never the page; the round clips', () => {
    render(<HostLobbyScreen><div /></HostLobbyScreen>);
    expect(screen.getByTestId('mp-host-lobby-body').className).toContain('overflow-y-auto');
    render(<MpRoundScreen><div /></MpRoundScreen>);
    expect(screen.getByTestId('mp-round-body').className).toContain('overflow-hidden');
  });

  it('MpCountdown is an overlay slot: it adds no frame around the countdown', () => {
    const { container } = render(<MpCountdown><div data-testid="go" /></MpCountdown>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('go');
  });
});
