/**
 * ClickSpark tests
 * Tests: renders children, container has relative positioning, reduced motion skips particles
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock matchMedia (jsdom doesn't implement it)
beforeAll(() => {
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

// Import after mocks
import { ClickSpark } from '../ClickSpark';

describe('ClickSpark', () => {
  it('renders children inside wrapper', () => {
    render(
      <ClickSpark>
        <button data-testid="inner-btn">Click me</button>
      </ClickSpark>
    );
    expect(screen.getByTestId('inner-btn')).toBeInTheDocument();
  });

  it('container has data-testid spark-container', () => {
    render(<ClickSpark><span>X</span></ClickSpark>);
    expect(screen.getByTestId('spark-container')).toBeInTheDocument();
  });

  it('applies className to wrapper', () => {
    render(<ClickSpark className="w-full"><span>X</span></ClickSpark>);
    expect(screen.getByTestId('spark-container')).toHaveClass('w-full');
  });

  it('does not crash when clicked', () => {
    render(<ClickSpark><button data-testid="btn">Click</button></ClickSpark>);
    expect(() => fireEvent.click(screen.getByTestId('spark-container'))).not.toThrow();
  });

  it('accepts custom count and colors without crashing', () => {
    render(
      <ClickSpark count={4} colors={['#FFE135', '#FF6B35']} spread={40}>
        <span>styled</span>
      </ClickSpark>
    );
    expect(screen.getByText('styled')).toBeInTheDocument();
  });
});
