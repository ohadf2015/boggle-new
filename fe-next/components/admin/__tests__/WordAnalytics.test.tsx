/**
 * Tests for WordAnalytics component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { WordAnalytics } from '../content/WordAnalytics';

const mockData = {
  invalidTrends: [
    { word: 'flurb', language: 'en', count: 15, status: 'pending' },
    { word: 'zxqwk', language: 'he', count: 8, status: 'pending' },
  ],
  totalPending: 23,
  totalApproved: 140,
};

describe('WordAnalytics', () => {
  it('should render top reported words', () => {
    render(<WordAnalytics data={mockData} />);
    expect(screen.getByText('flurb')).toBeInTheDocument();
    expect(screen.getByText('zxqwk')).toBeInTheDocument();
  });

  it('should show pending count', () => {
    render(<WordAnalytics data={mockData} />);
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('should show loading when data is null', () => {
    render(<WordAnalytics data={null} />);
    expect(screen.getByTestId('word-analytics-loading')).toBeInTheDocument();
  });
});
