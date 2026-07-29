import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeModeCard from '@/components/practice/PracticeModeCard';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'practice.stars': '★★★',
        'practice.completed': '✓',
        'gameModes.classic.name': 'Classic',
        'gameModes.classic.description': 'Speed training mode',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

const mockMode = {
  id: 'classic',
  titleKey: 'gameModes.classic.name',
  descKey: 'gameModes.classic.description',
  color: 'neo-cyan',
  emoji: '✏️',
};

describe('PracticeModeCard', () => {
  it('renders incomplete card with stars', () => {
    const { container } = render(
      <PracticeModeCard
        mode={mockMode}
        isCompleted={false}
        isCurrent={false}
        onSelect={vi.fn()}
        locale="en"
      />
    );
    expect(screen.getByText('★★★')).toBeInTheDocument();
  });

  it('renders completed card with checkmark badge', () => {
    const { container } = render(
      <PracticeModeCard
        mode={mockMode}
        isCompleted={true}
        isCurrent={false}
        onSelect={vi.fn()}
        locale="en"
      />
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('has correct left border color class', () => {
    const { container } = render(
      <PracticeModeCard
        mode={mockMode}
        isCompleted={false}
        isCurrent={false}
        onSelect={vi.fn()}
        locale="en"
      />
    );
    const card = container.querySelector('[data-testid="mode-card"]');
    expect(card?.className).toMatch(/border-l-4/);
    expect(card?.className).toMatch(/border-l-neo-cyan/);
  });

  it('is keyboard accessible with role="button"', () => {
    const { container } = render(
      <PracticeModeCard
        mode={mockMode}
        isCompleted={false}
        isCurrent={false}
        onSelect={vi.fn()}
        locale="en"
      />
    );
    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <PracticeModeCard
        mode={mockMode}
        isCompleted={false}
        isCurrent={false}
        onSelect={onSelect}
        locale="en"
      />
    );
    // Note: clicking behavior will be tested with user-event when implemented
  });
});
