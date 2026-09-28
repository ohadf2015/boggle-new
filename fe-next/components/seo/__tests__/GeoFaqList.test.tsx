// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GeoFaqList } from '../GeoFaqList';

describe('GeoFaqList', () => {
  it('renders questions as visible H3s, never as collapsed details', () => {
    const { container } = render(
      <GeoFaqList
        title="Classroom FAQ"
        items={[{ q: 'Do students need an account?', a: 'No. They join with a 6-character code.' }]}
      />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Classroom FAQ');
    expect(container.querySelector('h3')?.textContent).toBe('Do students need an account?');
    expect(container.querySelector('p')?.textContent).toContain('6-character');
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('[data-geo-faq]')).not.toBeNull();
  });

  it('accepts question/answer keys used by the education hub', () => {
    const { container } = render(
      <GeoFaqList
        title="FAQ"
        items={[{ question: 'Is it free?', answer: 'Yes, the free plan fits a real class.' }]}
      />,
    );
    expect(container.textContent).toContain('Is it free?');
    expect(container.textContent).toContain('free plan');
  });

  it('renders nothing when the list is empty', () => {
    const { container } = render(<GeoFaqList title="FAQ" items={[]} />);
    expect(container.querySelector('[data-geo-faq]')).toBeNull();
  });
});
