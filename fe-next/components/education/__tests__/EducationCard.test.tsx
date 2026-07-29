import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EducationCard } from '../EducationCard';

vi.mock('@/lib/animation/useScrollReveal', () => ({
  useScrollReveal: () => [{ current: null }, true],
}));

describe('EducationCard', () => {
  it('renders as a link with correct href', () => {
    render(
      <EducationCard
        href="/en/education/vocab"
        title="Vocabulary"
        description="Learn words"
      />
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/education/vocab');
  });

  it('renders title and description', () => {
    render(
      <EducationCard
        href="/test"
        title="Test Title"
        description="Test Description"
      />
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders optional badge', () => {
    render(
      <EducationCard
        href="/test"
        badge="Guide"
        title="Test"
        description="Test desc"
      />
    );
    expect(screen.getByText('Guide')).toBeInTheDocument();
  });

  it('applies default badge color if not provided', () => {
    const { container } = render(
      <EducationCard
        href="/test"
        badge="Guide"
        title="Test"
        description="Test desc"
      />
    );
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-neo-yellow');
  });

  it('applies custom badge color', () => {
    const { container } = render(
      <EducationCard
        href="/test"
        badge="ESL"
        badgeColor="neo-cyan"
        title="Test"
        description="Test desc"
      />
    );
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-neo-cyan');
  });

  it('applies scroll-reveal classes when visible', () => {
    const { container } = render(
      <EducationCard
        href="/test"
        title="Test"
        description="Test desc"
      />
    );
    const link = container.querySelector('a');
    expect(link?.className).toContain('opacity-100');
    expect(link?.className).toContain('translate-y-0');
  });

  it('renders children if provided', () => {
    render(
      <EducationCard
        href="/test"
        title="Test"
        description="Test desc"
      >
        <div data-testid="child">Child content</div>
      </EducationCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
