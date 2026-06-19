// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrosswordMasthead } from '../CrosswordMasthead';

describe('CrosswordMasthead', () => {
  it('renders the title, edition line and difficulty label', () => {
    render(
      <CrosswordMasthead
        title="LexiClash Daily"
        edition="Friday, June 20"
        difficulty="medium"
        difficultyLabel="Medium"
      />,
    );
    expect(screen.getByText('LexiClash Daily')).toBeInTheDocument();
    expect(screen.getByText('Friday, June 20')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('shows the streak chip when streak > 0', () => {
    render(
      <CrosswordMasthead
        title="LexiClash Daily"
        edition="Freeplay #3"
        difficulty="hard"
        difficultyLabel="Hard"
        streak={5}
        streakLabel="5-day streak"
      />,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByLabelText('5-day streak')).toBeInTheDocument();
  });

  it('hides the streak chip when streak is 0', () => {
    render(
      <CrosswordMasthead
        title="LexiClash Daily"
        edition="Freeplay #1"
        difficulty="easy"
        difficultyLabel="Easy"
        streak={0}
        streakLabel="0-day streak"
      />,
    );
    expect(screen.queryByLabelText('0-day streak')).not.toBeInTheDocument();
  });
});
