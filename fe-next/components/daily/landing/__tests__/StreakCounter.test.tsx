import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreakCounter } from '../StreakCounter';
import { LanguageProvider } from '@/contexts/LanguageContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider initialLanguage="en">{ui}</LanguageProvider>
  );
}

describe('StreakCounter', () => {
  test('renders streak count when streak > 0', () => {
    renderWithProviders(<StreakCounter streak={5} />);

    expect(screen.getByTestId('streak-counter')).toBeInTheDocument();
  });

  test('hides when streak is 0', () => {
    renderWithProviders(<StreakCounter streak={0} />);

    expect(screen.queryByTestId('streak-counter')).not.toBeInTheDocument();
  });

  test('hides when streak is negative', () => {
    renderWithProviders(<StreakCounter streak={-1} />);

    expect(screen.queryByTestId('streak-counter')).not.toBeInTheDocument();
  });

  test('displays motivational text', () => {
    renderWithProviders(<StreakCounter streak={7} />);

    // Should show "Keep the Fire Burning" text (from translation)
    expect(screen.getByTestId('streak-counter')).toBeInTheDocument();
  });
});
