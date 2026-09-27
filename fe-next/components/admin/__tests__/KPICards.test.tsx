/**
 * Tests for KPICards dashboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { KPICards } from '../overview/KPICards';

const mockStats = {
  overview: { totalPlayers: 1234, totalGames: 5678, totalWords: 99999, totalGameTimeHours: 420.5 },
  activity: { gamesToday: 42, uniquePlayersToday: 28, uniquePlayersWeek: 150, uniquePlayersMonth: 380, signupsToday: 5, signupsWeek: 35 },
  languages: { en: 3000, he: 1500, sv: 800, ja: 378 },
};

describe('KPICards', () => {
  it('should render all KPI values', () => {
    render(<KPICards stats={mockStats} />);

    // DAU
    expect(screen.getByText('28')).toBeInTheDocument();
    // Games today
    expect(screen.getByText('42')).toBeInTheDocument();
    // Signups today
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render stickiness ratio', () => {
    render(<KPICards stats={mockStats} />);

    // DAU/MAU = 28/380 = 7.4%
    expect(screen.getByText('7.4%')).toBeInTheDocument();
  });

  it('should show loading skeleton when stats is null', () => {
    render(<KPICards stats={null} />);

    const skeletons = screen.getAllByTestId('kpi-skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
