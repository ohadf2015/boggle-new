import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoundedConfettiBurst } from '../BoundedConfettiBurst';
import React from 'react';

// Mock InlineConfetti to avoid canvas/DOM issues in jsdom
vi.mock('@/components/effects/InlineConfetti', () => ({
  InlineConfetti: ({ onComplete }: { onComplete?: () => void }) => {
    React.useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return <div data-testid="inline-confetti">Confetti</div>;
  },
}));

// Mock prefersStaticFullscreenOverlay to test mobile web gate
vi.mock('@/lib/native/webViewLayerFlash', () => ({
  prefersStaticFullscreenOverlay: vi.fn(() => false),
}));

describe('BoundedConfettiBurst', () => {
  it('renders anchor element', () => {
    const { container } = render(
      <BoundedConfettiBurst trigger={true}>
        <button>Test Button</button>
      </BoundedConfettiBurst>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="bounded-confetti-anchor"]')).toBeInTheDocument();
  });

  it('renders confetti when trigger is true', () => {
    render(
      <BoundedConfettiBurst trigger={true}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    expect(screen.getByTestId('inline-confetti')).toBeInTheDocument();
  });

  it('does not render confetti when trigger is false', () => {
    render(
      <BoundedConfettiBurst trigger={false}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    expect(screen.queryByTestId('inline-confetti')).not.toBeInTheDocument();
  });

  it('accepts custom size configuration', () => {
    const { container } = render(
      <BoundedConfettiBurst trigger={true} size="lg">
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    expect(container.querySelector('[data-testid="bounded-confetti-anchor"]')).toBeInTheDocument();
  });

  it('accepts custom colors', () => {
    render(
      <BoundedConfettiBurst trigger={true} colors={['#FF0000', '#00FF00']}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    expect(screen.getByTestId('inline-confetti')).toBeInTheDocument();
  });

  it('calls onComplete callback when confetti animation finishes', () => {
    const onComplete = vi.fn();

    render(
      <BoundedConfettiBurst trigger={true} onComplete={onComplete}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    // In this mock, onComplete fires immediately
    expect(onComplete).toHaveBeenCalled();
  });

  it('constrains confetti to anchor bounds with overflow-hidden', () => {
    const { container } = render(
      <BoundedConfettiBurst trigger={true}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    const anchor = container.querySelector('[data-testid="bounded-confetti-anchor"]') as HTMLElement;
    const computedStyle = window.getComputedStyle(anchor);

    // Check overflow-hidden is applied
    expect(anchor.classList.contains('overflow-hidden')).toBe(true);
  });

  it('respects anchor dimensions prop', () => {
    const { container } = render(
      <BoundedConfettiBurst trigger={true} anchorDimensions={{ width: 200, height: 100 }}>
        <div>Content</div>
      </BoundedConfettiBurst>
    );

    const anchor = container.querySelector('[data-testid="bounded-confetti-anchor"]') as HTMLElement;
    expect(anchor).toHaveStyle('width: 200px');
    expect(anchor).toHaveStyle('height: 100px');
  });
});
