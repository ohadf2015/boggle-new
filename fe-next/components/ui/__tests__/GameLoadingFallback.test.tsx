import React from 'react';
import { render } from '@testing-library/react';
import { GameLoadingFallback } from '../GameLoadingFallback';

vi.mock('../PageLoader', () => ({
  PageLoader: ({ size }: { size?: string }) => <div data-testid="page-loader" data-size={size} />,
}));

describe('GameLoadingFallback', () => {
  it('renders PageLoader inside full-viewport neo-navy container', () => {
    const { getByTestId, container } = render(<GameLoadingFallback />);
    const loader = getByTestId('page-loader');
    expect(loader.getAttribute('data-size')).toBe('md');
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('bg-neo-navy');
    expect(wrapper.className).toContain('min-h-screen');
  });
});
