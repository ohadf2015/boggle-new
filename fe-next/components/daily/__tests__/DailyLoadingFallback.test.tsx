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

  it('keeps the Word Wheel arrival bare so its ready card is the only intro', () => {
    render(<DailyLoadingFallback mode="wordWheel" />);
    expect(screen.queryByText('wordWheel.hub.wordWheelQuest')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'wordWheel.hub.wordWheelQuest');
  });
});
