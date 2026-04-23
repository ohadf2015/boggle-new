import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdPlaceholder } from '../AdPlaceholder';

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('AdPlaceholder', () => {
  it('renders dev placeholder when showPlaceholder is true', () => {
    render(<AdPlaceholder zone="content-page" showPlaceholder />);
    expect(screen.getByText('Safe Zone: Content Page')).toBeInTheDocument();
  });

  it('renders nothing when showPlaceholder is false', () => {
    const { container } = render(<AdPlaceholder zone="post-game" showPlaceholder={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('passes className through to wrapper when visible', () => {
    const { container } = render(
      <AdPlaceholder zone="menu" showPlaceholder className="mt-4" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
