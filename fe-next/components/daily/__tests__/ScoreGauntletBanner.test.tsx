import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreGauntletBanner } from '../ScoreGauntletBanner';

describe('ScoreGauntletBanner', () => {
  it('renders challenger name and score', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={847}
        challengerEmoji="🎯"
        t={(k) => k}
      />
    );
    expect(screen.getByText(/Ohad/)).toBeInTheDocument();
    expect(screen.getByText(/847/)).toBeInTheDocument();
  });

  it('shows challenger emoji', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={847}
        challengerEmoji="🎯"
        t={(k) => k}
      />
    );
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('renders nothing when no challenge props', () => {
    const { container } = render(
      <ScoreGauntletBanner
        challengerName={null}
        challengerScore={null}
        challengerEmoji={null}
        t={(k) => k}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when challengerScore is 0', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={0}
        challengerEmoji="🎯"
        t={(k) => k}
      />
    );
    // Banner should render (score 0 is valid, not null)
    expect(screen.getByTestId('score-gauntlet-banner')).toBeInTheDocument();
  });

  it('shows fallback emoji when challengerEmoji is null', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={847}
        challengerEmoji={null}
        t={(k) => k}
      />
    );
    // Should show fallback 🎯
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });
});
