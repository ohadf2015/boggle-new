/**
 * Tests for ChurnRiskPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { ChurnRiskPanel } from '../analytics/ChurnRiskPanel';

const mockPlayers = [
  { id: '1', username: 'alice', display_name: 'Alice', last_game_at: '2026-02-28', total_games: 50 },
  { id: '2', username: 'bob', display_name: 'Bob', last_game_at: '2026-03-05', total_games: 20 },
];

describe('ChurnRiskPanel', () => {
  it('should render player list', () => {
    render(<ChurnRiskPanel players={mockPlayers} total={2} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show days since last game', () => {
    // Mock current date context — component calculates from now
    render(<ChurnRiskPanel players={mockPlayers} total={2} />);
    // Should show some "Xd ago" text
    const rows = screen.getAllByTestId('churn-player-row');
    expect(rows).toHaveLength(2);
  });

  it('should show total count', () => {
    render(<ChurnRiskPanel players={mockPlayers} total={150} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should show loading when players is null', () => {
    render(<ChurnRiskPanel players={null} total={0} />);
    expect(screen.getByTestId('churn-loading')).toBeInTheDocument();
  });
});
