import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ScrollRevealSection } from '../ScrollRevealSection';

vi.mock('@/lib/animation/useScrollReveal', () => ({
  useScrollReveal: () => [{ current: null }, true],
}));

describe('ScrollRevealSection', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ScrollRevealSection>
        <div>Test content</div>
      </ScrollRevealSection>
    );
    expect(getByText('Test content')).toBeInTheDocument();
  });

  it('applies scroll-reveal classes when visible', () => {
    const { container } = render(
      <ScrollRevealSection>
        <div>Test</div>
      </ScrollRevealSection>
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('opacity-100');
    expect(div.className).toContain('translate-y-0');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ScrollRevealSection className="mt-8 px-4">
        <div>Test</div>
      </ScrollRevealSection>
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('mt-8');
    expect(div.className).toContain('px-4');
  });
});
