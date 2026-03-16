import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { BlastSkillBreakdown } from '../BlastSkillBreakdown';
import type { BlastResultsData } from '../types';

const mockT = (key: string) => key;

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 500,
    tilesCleared: 30,
    totalTiles: 36,
    clearPercentage: 83,
    wordsFound: ['STORM', 'FIRE', 'CASTLE', 'DRAGON', 'ICE'],
    bestWord: 'CASTLE',
    maxCombo: 3,
    stars: 2,
    wavesCompleted: 2,
    waveResults: [],
    ...overrides,
  };
}

describe('BlastSkillBreakdown', () => {
  it('renders 4 skill metrics', () => {
    render(<BlastSkillBreakdown results={makeResults()} t={mockT} />);
    expect(screen.getByText('blast.skillAvgLength')).toBeTruthy();
    expect(screen.getByText('blast.skillLongWords')).toBeTruthy();
    expect(screen.getByText('blast.skillEfficiency')).toBeTruthy();
    expect(screen.getByText('blast.skillBoardClear')).toBeTruthy();
  });

  it('renders nothing when no words found', () => {
    const { container } = render(
      <BlastSkillBreakdown results={makeResults({ wordsFound: [] })} t={mockT} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('computes correct average word length', () => {
    // STORM(5) + FIRE(4) + CASTLE(6) + DRAGON(6) + ICE(3) = 24/5 = 4.8
    render(<BlastSkillBreakdown results={makeResults()} t={mockT} />);
    expect(screen.getByText('4.8')).toBeTruthy();
  });

  it('computes long word count correctly', () => {
    // CASTLE(6) + DRAGON(6) = 2 long words out of 5
    render(<BlastSkillBreakdown results={makeResults()} t={mockT} />);
    expect(screen.getByText('2/5 (40%)')).toBeTruthy();
  });

  it('shows board clear percentage', () => {
    render(<BlastSkillBreakdown results={makeResults()} t={mockT} />);
    expect(screen.getByText('83%')).toBeTruthy();
  });

  it('renders the section header', () => {
    render(<BlastSkillBreakdown results={makeResults()} t={mockT} />);
    expect(screen.getByText('blast.skillBreakdown')).toBeTruthy();
  });
});
