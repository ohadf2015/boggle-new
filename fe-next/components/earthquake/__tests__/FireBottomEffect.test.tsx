import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the fire-flame-react package
jest.mock('@9am/fire-flame-react', () => ({
  FireFlame: React.forwardRef(function MockFireFlame(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>
  ) {
    return <div data-testid="fire-flame" ref={ref as React.Ref<HTMLDivElement>} />;
  }),
}));

import { FireBottomEffect } from '../FireBottomEffect';

describe('FireBottomEffect', () => {
  it('should not render when isActive is false', () => {
    const { container } = render(<FireBottomEffect isActive={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render fire flame when isActive is true', () => {
    render(<FireBottomEffect isActive={true} />);
    expect(screen.getByTestId('fire-flame')).toBeInTheDocument();
  });

  it('should render with fixed positioning at bottom', () => {
    render(<FireBottomEffect isActive={true} />);
    const wrapper = screen.getByTestId('fire-bottom-effect');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('fixed');
    expect(wrapper.className).toContain('bottom-0');
  });

  it('should have pointer-events-none so it does not block interaction', () => {
    render(<FireBottomEffect isActive={true} />);
    const wrapper = screen.getByTestId('fire-bottom-effect');
    expect(wrapper.className).toContain('pointer-events-none');
  });

  it('should unmount cleanly when switching from active to inactive', () => {
    const { rerender } = render(<FireBottomEffect isActive={true} />);
    expect(screen.getByTestId('fire-flame')).toBeInTheDocument();

    rerender(<FireBottomEffect isActive={false} />);
    expect(screen.queryByTestId('fire-flame')).not.toBeInTheDocument();
  });

  it('should render via portal into document.body to escape stacking contexts', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateZ(0)' }}>
        <FireBottomEffect isActive={true} />
      </div>
    );
    // The fire effect should NOT be inside the container div (it portals out)
    const fireInContainer = container.querySelector('[data-testid="fire-bottom-effect"]');
    expect(fireInContainer).toBeNull();

    // But it should exist in document.body
    const fireInBody = document.body.querySelector('[data-testid="fire-bottom-effect"]');
    expect(fireInBody).toBeInTheDocument();
  });
});
