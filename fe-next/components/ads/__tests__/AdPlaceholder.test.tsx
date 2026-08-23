import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdPlaceholder } from '../AdPlaceholder';

const isNativePlatform = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}));

describe('AdPlaceholder', () => {
  afterEach(() => {
    isNativePlatform.mockReturnValue(false);
  });

  it('renders dev placeholder when showPlaceholder is true', () => {
    render(<AdPlaceholder zone="content-page" showPlaceholder />);
    expect(screen.getByText('Safe Zone: Content Page')).toBeInTheDocument();
  });

  it('renders a reserved-height spacer when showPlaceholder is false', () => {
    const { container } = render(<AdPlaceholder zone="post-game" showPlaceholder={false} />);
    const spacer = container.firstChild;
    expect(spacer).not.toBeNull();
    expect(spacer).toHaveClass('min-h-[100px]');
  });

  it('passes className through to wrapper when visible', () => {
    const { container } = render(
      <AdPlaceholder zone="menu" showPlaceholder className="mt-4" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });

  it('renders nothing on native platforms', () => {
    isNativePlatform.mockReturnValue(true);
    const { container } = render(<AdPlaceholder zone="post-game" showPlaceholder={false} />);
    expect(container.firstChild).toBeNull();
  });
});
