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

/** Force the slot's measured rect bottom (distance from viewport top). */
function setSlotRect(bottom: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: bottom - 60,
    bottom,
    left: 0,
    right: 0,
    width: 320,
    height: 60,
    x: 0,
    y: bottom - 60,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('InlineBannerAd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    isNativeMock.mockReturnValue(false);
    getPlatformMock.mockReturnValue('web');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
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
    setSlotRect(400); // mid-viewport (innerHeight 800) → on-screen

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

  it('positions the banner on the slot (margin = viewport-bottom gap) when on-screen', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    setSlotRect(500); // innerHeight 800 → margin 300 (safe-area 0 in mock)

    render(<InlineBannerAd variant="content" />);
    await Promise.resolve();
    expect(setRequest.mock.calls.at(-1)?.[1]).toMatchObject({ margin: 300 });
  });

  it('withdraws (does NOT pin a margin-0 banner to the viewport bottom) when the slot is below the fold', async () => {
    // The results-screen occlusion: a tall page leaves the in-flow slot below the
    // fold. Old code clamped margin→0 and showed the banner at the bottom over the
    // fixed CTA. New behavior: no request at all until the slot is on-screen.
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    setSlotRect(1200); // below innerHeight 800

    render(<InlineBannerAd variant="content" reservedHeight={60} />);
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();
  });

  it('defaults to the game banner variant when none specified', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    setSlotRect(400);

    render(<InlineBannerAd />);
    await Promise.resolve();
    expect(setRequest.mock.calls.at(-1)?.[1]).toMatchObject({ variant: 'game' });
  });

  it('requests variant=content when the prop is set', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    setSlotRect(400);

    render(<InlineBannerAd variant="content" />);
    await Promise.resolve();
    expect(setRequest.mock.calls.at(-1)?.[1]).toMatchObject({ variant: 'content' });
  });

  it('releases the slot on unmount (coordinator falls back to anchor, no blank)', async () => {
    isNativeMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    setSlotRect(400);

    const { unmount } = render(<InlineBannerAd />);
    await Promise.resolve();
    unmount();
    expect(clearRequest).toHaveBeenCalledWith('slot');
  });
});
