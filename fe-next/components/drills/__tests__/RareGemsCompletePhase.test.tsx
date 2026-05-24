import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RareGemsCompletePhase from '../RareGemsCompletePhase';

// t() echoes the key so we can assert which copy is shown.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));
vi.mock('../DrillCompleteActions', () => ({
  default: () => <div data-testid="drill-complete-actions" />,
}));

describe('RareGemsCompletePhase — cosy, no-fail copy', () => {
  it('celebrates a full pouch when the target was reached', () => {
    render(
      <RareGemsCompletePhase
        score={300} rareWordsFound={5} wordsFoundCount={9} targetRare={5}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText('brain.drills.pouchFull')).toBeInTheDocument();
  });

  it('frames a timeout as a haul, not a "Game Over"', () => {
    render(
      <RareGemsCompletePhase
        score={120} rareWordsFound={2} wordsFoundCount={6} targetRare={5}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText('brain.drills.timeUpHaul')).toBeInTheDocument();
    expect(screen.queryByText('brain.drills.gameOver')).not.toBeInTheDocument();
  });
});
