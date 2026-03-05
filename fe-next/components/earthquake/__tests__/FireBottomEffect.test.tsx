import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock useReducedMotion
let mockReducedMotion = false;
jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Mock the fire-flame-react package
jest.mock('@9am/fire-flame-react', () => ({
  FireFlame: React.forwardRef(function MockFireFlame(
    props: { option?: Record<string, unknown> },
    ref: React.Ref<unknown>
  ) {
    return (
      <div
        data-testid="fire-flame"
        ref={ref as React.Ref<HTMLDivElement>}
        data-option={JSON.stringify(props.option)}
      />
    );
  }),
}));

import { FireBottomEffect } from '../FireBottomEffect';

describe('FireBottomEffect', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('should not render when isActive is false', () => {
    const { container } = render(<FireBottomEffect isActive={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render fire flames when isActive is true', () => {
    render(<FireBottomEffect isActive={true} />);
    const flames = screen.getAllByTestId('fire-flame');
    expect(flames.length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByTestId('fire-flame').length).toBeGreaterThanOrEqual(1);

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

  it('should not render when user prefers reduced motion', () => {
    mockReducedMotion = true;
    const { container } = render(<FireBottomEffect isActive={true} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('fire-bottom-effect')).not.toBeInTheDocument();
  });

  it('should use warm fire colors (not default blue)', () => {
    render(<FireBottomEffect isActive={true} />);
    const flames = screen.getAllByTestId('fire-flame');
    const option = JSON.parse(flames[0].getAttribute('data-option') || '{}');
    // Should use warm colors, not the library defaults (blue/blueviolet)
    expect(option.innerColor).not.toBe('blue');
    expect(option.outerColor).not.toBe('blueviolet');
  });

  it('should position flame origin near the bottom of the canvas', () => {
    render(<FireBottomEffect isActive={true} />);
    const flames = screen.getAllByTestId('fire-flame');
    const option = JSON.parse(flames[0].getAttribute('data-option') || '{}');
    // y should be near the bottom of the canvas height
    expect(option.y).toBeGreaterThan(option.h * 0.5);
  });

  it('should render multiple flame sources across the width', () => {
    render(<FireBottomEffect isActive={true} />);
    const flames = screen.getAllByTestId('fire-flame');
    expect(flames.length).toBeGreaterThanOrEqual(2);
  });

  it('should update width on window resize', () => {
    render(<FireBottomEffect isActive={true} />);
    const flamesBefore = screen.getAllByTestId('fire-flame');
    const optionBefore = JSON.parse(flamesBefore[0].getAttribute('data-option') || '{}');

    // Simulate resize
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      window.dispatchEvent(new Event('resize'));
    });

    const flamesAfter = screen.getAllByTestId('fire-flame');
    const optionAfter = JSON.parse(flamesAfter[0].getAttribute('data-option') || '{}');
    // Width per flame should reflect the new window width
    expect(optionAfter.w).toBe(Math.ceil(800 / flamesAfter.length));
  });
});
