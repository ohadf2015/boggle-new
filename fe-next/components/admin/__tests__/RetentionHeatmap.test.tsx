/**
 * Tests for RetentionHeatmap component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { RetentionHeatmap } from '../analytics/RetentionHeatmap';

const mockCohorts = [
  { cohort_week: '2026-03-01', week_offset: 0, retained: 100, cohort_size: 100, retention_pct: 100 },
  { cohort_week: '2026-03-01', week_offset: 1, retained: 45, cohort_size: 100, retention_pct: 45 },
  { cohort_week: '2026-03-01', week_offset: 2, retained: 25, cohort_size: 100, retention_pct: 25 },
  { cohort_week: '2026-03-08', week_offset: 0, retained: 80, cohort_size: 80, retention_pct: 100 },
  { cohort_week: '2026-03-08', week_offset: 1, retained: 40, cohort_size: 80, retention_pct: 50 },
];

describe('RetentionHeatmap', () => {
  it('should render cohort weeks as rows', () => {
    render(<RetentionHeatmap cohorts={mockCohorts} />);
    expect(screen.getByText('Mar 1')).toBeInTheDocument();
    expect(screen.getByText('Mar 8')).toBeInTheDocument();
  });

  it('should render retention percentages', () => {
    render(<RetentionHeatmap cohorts={mockCohorts} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show cohort size', () => {
    render(<RetentionHeatmap cohorts={mockCohorts} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('should show loading when cohorts is null', () => {
    render(<RetentionHeatmap cohorts={null} />);
    expect(screen.getByTestId('retention-loading')).toBeInTheDocument();
  });
});
