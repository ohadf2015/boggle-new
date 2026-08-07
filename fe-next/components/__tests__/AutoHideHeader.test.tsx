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
});
