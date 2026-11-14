import { render, screen, within } from '@testing-library/react';
import { EducationBreakdown } from '../EducationBreakdown';

const t = (_k: string, fb?: string) => fb ?? _k;

describe('EducationBreakdown', () => {
  it('shows class games and student practice as separate categories with their modes', () => {
    render(
      <EducationBreakdown
        education={{
          classGames: { total: 5, modes: [{ mode: 'classic', count: 4 }, { mode: 'vocab-quiz', count: 1 }] },
          practice: { total: 7, modes: [{ mode: 'blitz', count: 7 }] },
        }}
        t={t}
      />,
    );
    const cls = screen.getByTestId('edu-class-games');
    expect(cls).toHaveTextContent('5');
    expect(within(cls).getByText('Classic')).toBeInTheDocument();
    expect(within(cls).getByText('4')).toBeInTheDocument();
    const practice = screen.getByTestId('edu-practice');
    expect(practice).toHaveTextContent('7');
    expect(within(practice).getByText('Blitz')).toBeInTheDocument();
  });

  it('says so when no class game or practice happened in the window', () => {
    render(<EducationBreakdown education={{ classGames: { total: 0, modes: [] }, practice: { total: 0, modes: [] } }} t={t} />);
    expect(screen.getAllByText('None in this range')).toHaveLength(2);
  });
});
