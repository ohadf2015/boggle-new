import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyLoadingFallback } from '../DailyLoadingFallback';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('DailyLoadingFallback', () => {
  it('renders the Word Hunt arrival card, not a spinner', () => {
    render(<DailyLoadingFallback mode="wordHunt" />);
    expect(screen.getByText('daily.wordHunt.title')).toBeInTheDocument();
  });

  it('renders the Word Wheel arrival card', () => {
    render(<DailyLoadingFallback mode="wordWheel" />);
    expect(screen.getByText('wordWheel.hub.wordWheelQuest')).toBeInTheDocument();
  });
});
