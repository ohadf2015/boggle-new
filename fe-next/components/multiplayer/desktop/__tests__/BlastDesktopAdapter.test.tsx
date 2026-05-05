import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlastDesktopAdapter } from '../BlastDesktopAdapter';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('BlastDesktopAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shell with mode=blast badge', () => {
    render(
      <BlastDesktopAdapter
        roomId="r1"
        leaderboard={[]}
        foundWords={[]}
        remainingTime={45}
        totalTime={90}
        comboCount={3}
        canvas={<div data-testid="blast-canvas" />}
      />,
    );
    expect(screen.getByText(/Blast/i)).toBeInTheDocument();
    expect(screen.getByTestId('blast-combo-meter')).toBeInTheDocument();
    expect(screen.getByTestId('blast-canvas')).toBeInTheDocument();
  });

  it('shows the current combo number', () => {
    render(
      <BlastDesktopAdapter
        roomId="r1"
        leaderboard={[]}
        foundWords={[]}
        remainingTime={45}
        totalTime={90}
        comboCount={5}
        canvas={<div />}
      />,
    );
    expect(screen.getByTestId('blast-combo-meter')).toHaveTextContent(/×5/);
  });
});
