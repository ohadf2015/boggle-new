/**
 * StreakFreezeIndicator Component Tests
 */
import { render, screen } from '@testing-library/react';
import { StreakFreezeIndicator } from '../StreakFreezeIndicator';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'daily.streakFreezeTooltip': 'Protects your streak if you miss a day (max 3)',
  };
  return translations[key] || key;
};

describe('StreakFreezeIndicator', () => {
  test('renders 3 slots total', () => {
    const { container } = render(<StreakFreezeIndicator freezeCount={0} t={mockT} />);
    const slots = container.querySelectorAll('[data-testid^="freeze-slot-"]');
    expect(slots).toHaveLength(3);
  });

  test('shows filled icons for available freezes', () => {
    const { container } = render(<StreakFreezeIndicator freezeCount={2} t={mockT} />);
    const filled = container.querySelectorAll('[data-testid="freeze-slot-filled"]');
    const empty = container.querySelectorAll('[data-testid="freeze-slot-empty"]');
    expect(filled).toHaveLength(2);
    expect(empty).toHaveLength(1);
  });

  test('shows all empty when count is 0', () => {
    const { container } = render(<StreakFreezeIndicator freezeCount={0} t={mockT} />);
    const empty = container.querySelectorAll('[data-testid="freeze-slot-empty"]');
    expect(empty).toHaveLength(3);
  });

  test('shows all filled when count is 3', () => {
    const { container } = render(<StreakFreezeIndicator freezeCount={3} t={mockT} />);
    const filled = container.querySelectorAll('[data-testid="freeze-slot-filled"]');
    expect(filled).toHaveLength(3);
  });

  test('has tooltip text', () => {
    render(<StreakFreezeIndicator freezeCount={1} t={mockT} />);
    expect(screen.getByTitle('Protects your streak if you miss a day (max 3)')).toBeInTheDocument();
  });
});
