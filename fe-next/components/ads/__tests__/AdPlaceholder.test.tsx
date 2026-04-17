import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdPlaceholder } from '../AdPlaceholder';

vi.mock('../AdUnit', () => ({
  AdUnit: (props: Record<string, unknown>) => (
    <div data-testid="ad-unit" data-slot={props.adSlot} data-width={props.width} data-height={props.height} />
  ),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('AdPlaceholder', () => {
  const prevApproved = process.env.NEXT_PUBLIC_ADSENSE_APPROVED;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_ADSENSE_APPROVED = 'true';
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_ADSENSE_APPROVED = prevApproved;
  });

  it('renders dev placeholder when showPlaceholder is true', () => {
    render(<AdPlaceholder zone="content-page" showPlaceholder />);
    expect(screen.getByText('Safe Zone: Content Page')).toBeInTheDocument();
  });

  it('renders AdUnit in production mode (showPlaceholder=false)', () => {
    render(<AdPlaceholder zone="post-game" showPlaceholder={false} />);
    const adUnit = screen.getByTestId('ad-unit');
    expect(adUnit).toBeInTheDocument();
    expect(adUnit).toHaveAttribute('data-slot', 'PENDING_APPROVAL');
  });

  it('maps content-page zone to responsive ad format', () => {
    render(<AdPlaceholder zone="content-page" showPlaceholder={false} />);
    const adUnit = screen.getByTestId('ad-unit');
    // content-page uses responsive (no width/height)
    expect(adUnit).not.toHaveAttribute('data-width');
  });

  it('maps post-game zone to 300x250', () => {
    render(<AdPlaceholder zone="post-game" showPlaceholder={false} />);
    const adUnit = screen.getByTestId('ad-unit');
    expect(adUnit).toHaveAttribute('data-width', '300');
    expect(adUnit).toHaveAttribute('data-height', '250');
  });

  it('maps between-rounds zone to 320x100', () => {
    render(<AdPlaceholder zone="between-rounds" showPlaceholder={false} />);
    const adUnit = screen.getByTestId('ad-unit');
    expect(adUnit).toHaveAttribute('data-width', '320');
    expect(adUnit).toHaveAttribute('data-height', '100');
  });

  it('passes className through to wrapper', () => {
    const { container } = render(
      <AdPlaceholder zone="menu" showPlaceholder={false} className="mt-4" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
