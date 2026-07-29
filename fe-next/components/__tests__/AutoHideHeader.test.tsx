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

  it('returns null during TV fullscreen', () => {
    mockIsTvFullscreen = true;
    const { queryByTestId } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
  });

  it('returns null during active gameplay', () => {
    mockIsInGame = true;
    const { queryByTestId } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
  });

  it('returns null on CrazyGames platform — CG provides its own chrome and the in-app header has no menu/auth/dropdown to render anyway', () => {
    mockIsOnCrazyGamesPlatform = true;
    const { queryByTestId } = render(<AutoHideHeader />);
    expect(queryByTestId('header-mounted')).toBeNull();
  });

  it('reports visibility=false through onVisibilityChange when on CrazyGames', () => {
    mockIsOnCrazyGamesPlatform = true;
    const onVisibilityChange = vi.fn();
    render(<AutoHideHeader onVisibilityChange={onVisibilityChange} />);
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });
});
