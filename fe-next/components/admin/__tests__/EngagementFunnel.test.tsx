/**
 * Tests for EngagementFunnel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { EngagementFunnel } from '../analytics/EngagementFunnel';

const mockFunnel = {
  registered: 500,
  playedFirstGame: 350,
  returnedDay7: 120,
  returnedDay30: 50,
};

describe('EngagementFunnel', () => {
  it('should render all funnel steps', () => {
    render(<EngagementFunnel funnel={mockFunnel} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should render conversion rates', () => {
    render(<EngagementFunnel funnel={mockFunnel} />);
    // 350/500 = 70%
    expect(screen.getByText('70.0%')).toBeInTheDocument();
  });

  it('should show loading when funnel is null', () => {
    render(<EngagementFunnel funnel={null} />);
    expect(screen.getByTestId('funnel-loading')).toBeInTheDocument();
  });
});
