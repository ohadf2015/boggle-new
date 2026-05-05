import React from 'react';
import { render, screen } from '@testing-library/react';
import InlineBannerAd from '../InlineBannerAd';

const showBannerMock = vi.fn();
const hideBannerMock = vi.fn();
const isNativeMock = vi.fn();
const getPlatformMock = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativeMock(),
    getPlatform: () => getPlatformMock(),
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ showBanner: showBannerMock, hideBanner: hideBannerMock }),
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('../AdPlaceholder', () => ({
  AdPlaceholder: (props: { zone: string; className?: string }) => (
    <div data-testid="ad-placeholder" data-zone={props.zone} className={props.className} />
  ),
}));

describe('InlineBannerAd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeMock.mockReturnValue(false);
    getPlatformMock.mockReturnValue('web');
  });

  it('delegates to AdPlaceholder on web', () => {
    render(<InlineBannerAd webZone="menu" className="my-4" />);
    const placeholder = screen.getByTestId('ad-placeholder');
    expect(placeholder).toHaveAttribute('data-zone', 'menu');
    expect(placeholder).toHaveClass('my-4');
  });

  it('defaults web zone to content-page', () => {
    render(<InlineBannerAd />);
    expect(screen.getByTestId('ad-placeholder')).toHaveAttribute('data-zone', 'content-page');
  });

  it('does not call AdMob banner APIs on web', () => {
    render(<InlineBannerAd webZone="menu" />);
    expect(showBannerMock).not.toHaveBeenCalled();
    expect(hideBannerMock).not.toHaveBeenCalled();
  });

  it('renders reserved slot on native and invokes showBanner', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    showBannerMock.mockResolvedValue(undefined);
    hideBannerMock.mockResolvedValue(undefined);

    const { container } = render(<InlineBannerAd reservedHeight={72} />);
    // Reserved slot rendered (no AdPlaceholder on native).
    expect(screen.queryByTestId('ad-placeholder')).toBeNull();
    const slot = container.querySelector('[data-ad-slot="inline-banner"]') as HTMLElement;
    expect(slot).toBeInTheDocument();
    expect(slot.style.height).toBe('72px');

    // Let the effect's async show() resolve.
    await Promise.resolve();
    await Promise.resolve();
    expect(showBannerMock).toHaveBeenCalled();
  });

  it('defaults to game banner variant when none specified', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    showBannerMock.mockResolvedValue(undefined);
    hideBannerMock.mockResolvedValue(undefined);

    render(<InlineBannerAd />);
    await Promise.resolve();
    await Promise.resolve();
    const lastCall = showBannerMock.mock.calls.at(-1);
    expect(lastCall?.[2]).toEqual({ variant: 'game' });
  });

  it('passes variant=content to showBanner when prop set', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    showBannerMock.mockResolvedValue(undefined);
    hideBannerMock.mockResolvedValue(undefined);

    render(<InlineBannerAd variant="content" />);
    await Promise.resolve();
    await Promise.resolve();
    const lastCall = showBannerMock.mock.calls.at(-1);
    expect(lastCall?.[2]).toEqual({ variant: 'content' });
  });
});
