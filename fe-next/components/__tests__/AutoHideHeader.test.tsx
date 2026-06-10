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
});
