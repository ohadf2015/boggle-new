import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PurpleAds from '../PurpleAds';

vi.mock('next/script', () => ({
  default: (props: { id?: string; src?: string; 'data-testid'?: string }) => (
    <script data-testid={props['data-testid'] ?? 'purpleads-script'} data-id={props.id} data-src={props.src} />
  ),
}));

type WinExt = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  __crazyGamesEnvironment?: string;
};

const setHost = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname },
    writable: true,
  });
};

describe('PurpleAds', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalEnabled = process.env.NEXT_PUBLIC_PURPLEADS_ENABLED;
  let win: WinExt;

  beforeEach(() => {
    win = window as WinExt;
    delete win.Capacitor;
    delete win.__crazyGamesEnvironment;
    setHost('lexiclash.live');
    // @ts-expect-error override readonly
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_PURPLEADS_ENABLED = 'true';
  });

  afterEach(() => {
    // @ts-expect-error restore
    process.env.NODE_ENV = originalEnv;
    if (originalEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_PURPLEADS_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_PURPLEADS_ENABLED = originalEnabled;
    }
    vi.restoreAllMocks();
  });

  it('renders script on production web host when enabled', () => {
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).not.toBeNull();
  });

  it('skips when NEXT_PUBLIC_PURPLEADS_ENABLED is not "true" (kill switch)', () => {
    delete process.env.NEXT_PUBLIC_PURPLEADS_ENABLED;
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });

  it('skips in development', () => {
    // @ts-expect-error override
    process.env.NODE_ENV = 'development';
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });

  it('skips on localhost', () => {
    setHost('localhost');
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });

  it('skips inside Capacitor native app', () => {
    win.Capacitor = { isNativePlatform: () => true };
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });

  it('skips when CrazyGames env is set', () => {
    win.__crazyGamesEnvironment = 'crazygames';
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });

  it('skips on icecream.me preview host (CG)', () => {
    setHost('preview.icecream.me');
    const { queryByTestId } = render(<PurpleAds />);
    expect(queryByTestId('purpleads-script')).toBeNull();
  });
});
