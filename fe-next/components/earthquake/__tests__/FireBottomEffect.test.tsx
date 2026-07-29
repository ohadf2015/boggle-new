import { render, screen, act } from '@testing-library/react';

// Mock useReducedMotion
let mockReducedMotion = false;
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Mock canvas 2D context
const mockPutImageData = vi.fn();
const mockCreateImageData = vi.fn((w: number, h: number) => ({
  data: new Uint8ClampedArray(w * h * 4),
}));

beforeAll(() => {
   
  (HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
    createImageData: mockCreateImageData,
    putImageData: mockPutImageData,
  }));
});

import { FireBottomEffect } from '../FireBottomEffect';

describe('FireBottomEffect', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('should not render when isActive is false', () => {
    const { container } = render(<FireBottomEffect isActive={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render a canvas when isActive is true', () => {
    render(<FireBottomEffect isActive={true} />);
    const wrapper = screen.getByTestId('fire-bottom-effect');
    const canvas = wrapper.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render with fixed positioning covering full viewport', () => {
    render(<FireBottomEffect isActive={true} />);
    const wrapper = screen.getByTestId('fire-bottom-effect');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('fixed');
    expect(wrapper.className).toContain('inset-0');
  });

  it('should have pointer-events-none so it does not block interaction', () => {
    render(<FireBottomEffect isActive={true} />);
    const wrapper = screen.getByTestId('fire-bottom-effect');
    expect(wrapper.className).toContain('pointer-events-none');
  });

  it('should unmount cleanly when switching from active to inactive', () => {
    const { rerender } = render(<FireBottomEffect isActive={true} />);
    expect(screen.getByTestId('fire-bottom-effect')).toBeInTheDocument();

    rerender(<FireBottomEffect isActive={false} />);
    expect(screen.queryByTestId('fire-bottom-effect')).not.toBeInTheDocument();
  });

  it('should render via portal into document.body to escape stacking contexts', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateZ(0)' }}>
        <FireBottomEffect isActive={true} />
      </div>
    );
    const fireInContainer = container.querySelector('[data-testid="fire-bottom-effect"]');
    expect(fireInContainer).toBeNull();

    const fireInBody = document.body.querySelector('[data-testid="fire-bottom-effect"]');
    expect(fireInBody).toBeInTheDocument();
  });

  it('should not render when user prefers reduced motion', () => {
    mockReducedMotion = true;
    const { container } = render(<FireBottomEffect isActive={true} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('fire-bottom-effect')).not.toBeInTheDocument();
  });

  it('should use pixelated image rendering on canvas', () => {
    render(<FireBottomEffect isActive={true} />);
    const canvas = screen.getByTestId('fire-bottom-effect').querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas!.style.imageRendering).toBe('pixelated');
  });

  it('should scale canvas to fill container', () => {
    render(<FireBottomEffect isActive={true} />);
    const canvas = screen.getByTestId('fire-bottom-effect').querySelector('canvas');
    expect(canvas!.style.width).toBe('100%');
    expect(canvas!.style.height).toBe('100%');
  });

  it('should update canvas dimensions on window resize', () => {
    render(<FireBottomEffect isActive={true} />);
    const canvasBefore = screen.getByTestId('fire-bottom-effect').querySelector('canvas');
    const widthBefore = canvasBefore!.width;

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      window.dispatchEvent(new Event('resize'));
    });

    const canvasAfter = screen.getByTestId('fire-bottom-effect').querySelector('canvas');
    expect(canvasAfter!.width).not.toBe(widthBefore);
  });
});
