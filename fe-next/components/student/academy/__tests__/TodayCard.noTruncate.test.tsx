import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }) }));

import { TodayCard } from '../TodayCard';

describe('Today chips on a 390px phone', () => {
  it('Given long labels, Then every label wraps in full instead of being cut with an ellipsis', () => {
    render(<TodayCard items={[{ id: 'warmup', done: true }, { id: 'chest', done: false }, { id: 'streak', done: true, count: 4 }]} warmup={null} />);
    for (const id of ['warmup', 'chest', 'streak']) {
      const chip = screen.getByTestId(`academy-today-${id}`);
      const label = chip.querySelector('span')!;
      expect(label.className).not.toMatch(/line-clamp|truncate|text-ellipsis/);
      expect(chip.className).toMatch(/flex-col/);
    }
    expect(screen.getByText('All homework done')).toBeInTheDocument();
  });

  it('Given a student with no streak yet, Then the flame chip invites them to light it instead of saying 0-day', () => {
    render(<TodayCard items={[{ id: 'streak', done: false, count: 0 }]} warmup={null} />);
    expect(screen.getByTestId('academy-today-streak')).toHaveTextContent('Light your flame');
    expect(screen.queryByText(/0-day/)).toBeNull();
  });
});
