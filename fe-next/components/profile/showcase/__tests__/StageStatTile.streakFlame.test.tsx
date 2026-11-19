import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageStatTile } from '../StageStatTile';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('StageStatTile streak flame', () => {
  it('shows the tiered flame for the streak stat', () => {
    render(<StageStatTile stat={{ id: 'streak', value: 8 }} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'blue');
  });

  it('keeps the plain icon for other stats', () => {
    render(<StageStatTile stat={{ id: 'wins', value: 8 }} />);
    expect(screen.queryByTestId('streak-flame')).toBeNull();
  });
});
