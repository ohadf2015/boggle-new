import { render, screen, fireEvent } from '@testing-library/react';
import { ClickSpark } from '../ClickSpark';

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ClickSpark', () => {
  it('renders children', () => {
    render(
      <ClickSpark>
        <button>Click me</button>
      </ClickSpark>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('creates spark particles on click', () => {
    const { container } = render(
      <ClickSpark count={4}>
        <button>Spark</button>
      </ClickSpark>
    );

    const wrapper = container.querySelector('.relative');
    expect(wrapper).not.toBeNull();

    fireEvent.click(wrapper!, { clientX: 50, clientY: 50 });

    // Should have 4 particle spans appended to the wrapper
    const particles = wrapper!.querySelectorAll('span');
    expect(particles.length).toBe(4);
  });

  it('does not create particles when prefers-reduced-motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(
      <ClickSpark count={4}>
        <button>No spark</button>
      </ClickSpark>
    );

    const wrapper = container.querySelector('.relative');
    fireEvent.click(wrapper!, { clientX: 50, clientY: 50 });

    const particles = wrapper!.querySelectorAll('span[style*="clickSparkRadiate"]');
    expect(particles.length).toBe(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <ClickSpark className="my-class">
        <span>Test</span>
      </ClickSpark>
    );
    expect(container.querySelector('.my-class')).not.toBeNull();
  });
});
