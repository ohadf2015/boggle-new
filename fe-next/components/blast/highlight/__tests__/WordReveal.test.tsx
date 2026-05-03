import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordReveal } from '../WordReveal';

describe('WordReveal', () => {
  it('renders each letter as separate span', () => {
    render(<WordReveal word="CAT" visible={true} />);
    const spans = screen.getAllByTestId('word-reveal-letter');
    expect(spans.length).toBe(3);
    expect(spans.map(s => s.textContent)).toEqual(['C', 'A', 'T']);
  });

  it('container has dir=auto for RTL safety', () => {
    render(<WordReveal word="שלום" visible={true} />);
    const container = screen.getByTestId('word-reveal');
    expect(container).toHaveAttribute('dir', 'auto');
  });

  it('hidden when visible=false', () => {
    const { container } = render(<WordReveal word="X" visible={false} />);
    expect(container.querySelector('[data-testid="word-reveal-letter"]')).toBeNull();
  });
});
