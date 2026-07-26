import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LightningRoundCompletePhase from '../LightningRoundCompletePhase';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));
vi.mock('../DrillCompleteActions', () => ({
  default: () => <div data-testid="drill-complete-actions" />,
}));
vi.mock('@/components/brain/DrillEarningsBreakdown', () => ({
  default: () => <div data-testid="drill-earnings" />,
}));

const baseProps = {
  level: 1,
  forgivingScore: {
    badge: 'bronze' as const,
    displayScore: 50,
    participation: 30,
    performance: 20,
  },
  wordsFoundCount: 4,
  wordsPerMinute: 12,
  onPlayAgain: vi.fn(),
};

describe('LightningRoundCompletePhase — topMissedWords word replay', () => {
  it('renders nothing when topMissedWords is absent', () => {
    render(<LightningRoundCompletePhase {...baseProps} />);
    expect(screen.queryByText('brain.drills.missedWords')).not.toBeInTheDocument();
  });

  it('shows the missed-words label when topMissedWords provided', () => {
    render(
      <LightningRoundCompletePhase
        {...baseProps}
        topMissedWords={[{ word: 'CAT', pts: 6 }]}
      />,
    );
    expect(screen.getByText('brain.drills.missedWords')).toBeInTheDocument();
  });

  it('renders each letter of each missed word as a separate span', () => {
    render(
      <LightningRoundCompletePhase
        {...baseProps}
        topMissedWords={[
          { word: 'CAT', pts: 6 },
          { word: 'DOG', pts: 8 },
        ]}
      />,
    );
    // All 6 letters rendered individually
    const letters = ['C', 'A', 'T', 'D', 'O', 'G'];
    letters.forEach(l => {
      expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    });
  });

  it('renders the point delta for each missed word', () => {
    render(
      <LightningRoundCompletePhase
        {...baseProps}
        topMissedWords={[
          { word: 'CAT', pts: 6 },
          { word: 'BLAST', pts: 22 },
        ]}
      />,
    );
    expect(screen.getByText('+6')).toBeInTheDocument();
    expect(screen.getByText('+22')).toBeInTheDocument();
  });

  it('renders no missed words when array is empty', () => {
    render(
      <LightningRoundCompletePhase {...baseProps} topMissedWords={[]} />,
    );
    expect(screen.queryByText('brain.drills.missedWords')).not.toBeInTheDocument();
  });
});
