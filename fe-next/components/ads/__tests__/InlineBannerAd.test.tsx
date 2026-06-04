import React from 'react';
import { render, screen } from '@testing-library/react';
import InlineBannerAd from '../InlineBannerAd';
import { bannerController } from '@/lib/native/bannerController';

const isNativeMock = vi.fn();
const getPlatformMock = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativeMock(),
    getPlatform: () => getPlatformMock(),
  },
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('../AdPlaceholder', () => ({
  AdPlaceholder: (props: { zone: string; className?: string }) => (
    <div data-testid="ad-placeholder" data-zone={props.zone} className={props.className} />
  ),
}));

vi.mock('@/lib/native/bannerController', async () => {
  const actual = await vi.importActual<typeof import('@/lib/native/bannerController')>(
    '@/lib/native/bannerController',
  );
  return {
    ...actual,
    bannerController: {
      setRequest: vi.fn().mockResolvedValue(undefined),
      clearRequest: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const setRequest = bannerController.setRequest as ReturnType<typeof vi.fn>;
const clearRequest = bannerController.clearRequest as ReturnType<typeof vi.fn>;

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

  it('does not touch the banner coordinator on web', () => {
    render(<InlineBannerAd webZone="menu" />);
    expect(setRequest).not.toHaveBeenCalled();
    expect(clearRequest).not.toHaveBeenCalled();
  });

  it('renders reserved slot on native and requests the slot banner', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');

    const { container } = render(<InlineBannerAd reservedHeight={72} />);
    expect(screen.queryByTestId('ad-placeholder')).toBeNull();
    const slot = container.querySelector('[data-ad-slot="inline-banner"]') as HTMLElement;
    expect(slot).toBeInTheDocument();
    expect(slot.style.height).toBe('72px');

    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(
      'slot',
      expect.objectContaining({ variant: 'game', priority: 2 }),
    );
  });

  it('defaults to the game banner variant when none specified', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');

    render(<InlineBannerAd />);
    await Promise.resolve();
    expect(setRequest.mock.calls.at(-1)?.[1]).toMatchObject({ variant: 'game' });
  });

  it('requests variant=content when the prop is set', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');

    render(<InlineBannerAd variant="content" />);
    await Promise.resolve();
    expect(setRequest.mock.calls.at(-1)?.[1]).toMatchObject({ variant: 'content' });
  });

  it('releases the slot on unmount (coordinator falls back to anchor, no blank)', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');

    const { unmount } = render(<InlineBannerAd />);
    await Promise.resolve();
    unmount();
    expect(clearRequest).toHaveBeenCalledWith('slot');
  });
});
