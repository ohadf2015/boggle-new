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
});
