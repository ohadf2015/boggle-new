import { useState } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoHideHeader } from '@/components/AutoHideHeader';

let mockIsTvFullscreen = false;
let mockIsInGame = false;
let mockIsOnCrazyGamesPlatform = false;

vi.mock('@/hooks/useTvFullscreenListener', () => ({
  useTvFullscreenListener: () => mockIsTvFullscreen,
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ isInGame: mockIsInGame }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform }),
}));

vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="header-mounted" />,
}));

describe('AutoHideHeader', () => {
  beforeEach(() => {
    mockIsTvFullscreen = false;
    mockIsInGame = false;
    mockIsOnCrazyGamesPlatform = false;
  });

  it('renders Header by default (web, lobby)', () => {
    const { queryByTestId } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).not.toBeNull();
  });

  it('hides header (no header-mounted) during TV fullscreen but keeps spacer to prevent CLS', () => {
    mockIsTvFullscreen = true;
    const { queryByTestId, container } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('hides header (no header-mounted) during active gameplay but keeps spacer to prevent CLS', () => {
    mockIsInGame = true;
    const { queryByTestId, container } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('returns null (no spacer) on CrazyGames platform — CG provides its own chrome; spacer would create visible empty band', () => {
    mockIsOnCrazyGamesPlatform = true;
    const { queryByTestId, container } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('reports visibility=false through onVisibilityChange when on CrazyGames', () => {
    mockIsOnCrazyGamesPlatform = true;
    const onVisibilityChange = vi.fn();
    render(<AutoHideHeader onVisibilityChange={onVisibilityChange} />);
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });

  it('reports visibility=false through onVisibilityChange during active gameplay', () => {
    mockIsInGame = true;
    const onVisibilityChange = vi.fn();
    render(<AutoHideHeader onVisibilityChange={onVisibilityChange} />);
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });

  // Regression: onVisibilityChange used to be invoked in the render body, which
  // is a parent setState-during-child-render (React logs "Cannot update a
  // component while rendering a different component" and schedules an extra
  // render pass). It must fire from an effect — once per actual change.
  it('reports visibility from an effect: fires once on mount, not again on a re-render with unchanged visibility', () => {
    const onVisibilityChange = vi.fn();
    const { rerender } = render(<AutoHideHeader onVisibilityChange={onVisibilityChange} />);

    expect(onVisibilityChange).toHaveBeenCalledTimes(1);
    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);

    onVisibilityChange.mockClear();
    rerender(<AutoHideHeader onVisibilityChange={onVisibilityChange} />);
    expect(onVisibilityChange).not.toHaveBeenCalled();
  });

  it('does not call onVisibilityChange while rendering (parent may setState in the callback)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Parent() {
      const [visible, setVisible] = useState(true);
      return (
        <div data-visible={String(visible)}>
          <AutoHideHeader onVisibilityChange={setVisible} />
        </div>
      );
    }

    render(<Parent />);

    const renderPhaseWarning = consoleError.mock.calls.some((args) =>
      args.some((arg) => typeof arg === 'string' && arg.includes('Cannot update a component')),
    );
    expect(renderPhaseWarning).toBe(false);
    consoleError.mockRestore();
  });

  it('collapses the spacer (returns null) during gameplay when collapseSpacerWhenHidden is set — no empty band on focused game screens', () => {
    mockIsInGame = true;
    const { queryByTestId, container } = render(
      <AutoHideHeader collapseSpacerWhenHidden />,
    );
    expect(queryByTestId('header-mounted')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('collapses the spacer (returns null) during TV fullscreen when collapseSpacerWhenHidden is set', () => {
    mockIsTvFullscreen = true;
    const { queryByTestId, container } = render(
      <AutoHideHeader collapseSpacerWhenHidden />,
    );
    expect(queryByTestId('header-mounted')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('still renders Header normally (lobby) when collapseSpacerWhenHidden is set but not in game', () => {
    const { queryByTestId } = render(<AutoHideHeader collapseSpacerWhenHidden />);
    expect(queryByTestId('header-mounted')).not.toBeNull();
  });

  /**
   * `collapseSpacerWhenHidden="user-initiated"` exists for /multiplayer, where an
   * unconditional collapse and an unconditional spacer are BOTH wrong:
   *
   *  - Always keeping the spacer leaves an 80px empty band above the room lobby's
   *    own sticky header (measured on production: spacer at top 0 height 80, the
   *    room header pushed to top 84).
   *  - Always collapsing it caused CLS 0.979 on reconnect, where `isInGame` flips
   *    ~200ms after mount with no user input at all.
   *
   * The discriminator is user input: tapping into a room puts the shift inside the
   * CLS input-exclusion window, a reconnect has no input to exclude it. So the
   * collapse is latched from `navigator.userActivation` at the moment the header
   * hides, and stays put after that (userActivation.isActive is transient — re-read
   * on a later render it would flip the spacer back in).
   */
  describe('collapseSpacerWhenHidden="user-initiated"', () => {
    /**
     * `hasBeenActive` is the field that matters: it is sticky for the page
     * lifetime, whereas `isActive` is a transient ~5s window. Joining a room is a
     * socket round-trip, so `isActive` can already have expired by the time
     * `isInGame` flips — the tests below pin the two apart so a future change back
     * to `isActive` fails loudly instead of silently restoring the empty band.
     */
    const setUserActivation = (
      activation: { hasBeenActive: boolean; isActive?: boolean } | undefined,
    ) => {
      Object.defineProperty(navigator, 'userActivation', {
        value: activation && { isActive: false, ...activation },
        configurable: true,
      });
    };

    it('collapses the spacer when the user tapped into the game (shift is input-excluded)', () => {
      setUserActivation({ hasBeenActive: true });
      mockIsInGame = true;
      const { container } = render(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it('keeps the spacer when the header hides with no user input (reconnect → real CLS)', () => {
      setUserActivation({ hasBeenActive: false });
      mockIsInGame = true;
      const { container } = render(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    it('keeps the spacer when the browser does not expose userActivation (degrade to today behaviour)', () => {
      setUserActivation(undefined);
      mockIsInGame = true;
      const { container } = render(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    // The real reconnect shape: the page mounts NOT in game (header visible), then
    // isActive flips ~200ms after the socket connects, with no gesture in between.
    // This is the CLS 0.979 case, and it is the flip — not a hidden-from-mount
    // render — that the spacer has to survive.
    it('keeps the spacer when isInGame flips after mount with no interaction (the reconnect case)', () => {
      setUserActivation({ hasBeenActive: false });
      mockIsInGame = false;
      const { container, rerender } = render(
        <AutoHideHeader collapseSpacerWhenHidden="user-initiated" />,
      );

      mockIsInGame = true;
      rerender(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    // Same flip, but the user tapped a room first — the shift is theirs, so the
    // band goes away.
    it('collapses the spacer when isInGame flips after the user interacted', () => {
      setUserActivation({ hasBeenActive: true });
      mockIsInGame = false;
      const { container, rerender } = render(
        <AutoHideHeader collapseSpacerWhenHidden="user-initiated" />,
      );

      mockIsInGame = true;
      rerender(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    // Joining a room is a socket round-trip, so the transient activation window can
    // be long gone by the time isInGame flips. Reading `isActive` instead of
    // `hasBeenActive` would keep the spacer here and leave the reported empty band
    // in place — with every other test in this file still green.
    it('collapses the spacer when the transient activation has expired but the user did interact', () => {
      setUserActivation({ hasBeenActive: true, isActive: false });
      mockIsInGame = true;
      const { container } = render(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it('does not re-add the spacer if activation state changes mid-game', () => {
      setUserActivation({ hasBeenActive: true });
      mockIsInGame = true;
      const { container, rerender } = render(
        <AutoHideHeader collapseSpacerWhenHidden="user-initiated" />,
      );
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

      setUserActivation({ hasBeenActive: false });
      rerender(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it('still renders the real Header in the room list (not in game)', () => {
      setUserActivation({ hasBeenActive: true });
      const { queryByTestId } = render(<AutoHideHeader collapseSpacerWhenHidden="user-initiated" />);
      expect(queryByTestId('header-mounted')).not.toBeNull();
    });
  });
});
