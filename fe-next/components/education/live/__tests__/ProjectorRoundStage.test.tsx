import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectorRoundStage } from '../ProjectorRoundStage';
import { catalogueModes } from '@/components/education/ClassroomModeCatalogueData';

const t = (key: string) => key;
const GRID = [['a', 'b'], ['c', 'd']];

describe('ProjectorRoundStage', () => {
  it.each(['classic', 'word-hunt'])('Given %s, where every phone plays the same board, Then the wall shows that board', (mode) => {
    render(<ProjectorRoundStage gameMode={mode} grid={GRID} wheelPuzzle={null} t={t} />);
    expect(screen.getByTestId('projector-board')).toBeInTheDocument();
  });

  it('Given blast, where each phone has its own board, Then the wall names the mode and says it plays on phones instead of showing a stale board', () => {
    render(<ProjectorRoundStage gameMode="blast" grid={GRID} wheelPuzzle={null} t={t} />);
    expect(screen.queryByTestId('projector-board')).toBeNull();
    const card = screen.getByTestId('projector-phone-mode');
    expect(card).toHaveTextContent('teacher.classroom.gameModes.blast');
    expect(card).toHaveTextContent('education.modePicker.how.blast');
    expect(card).toHaveTextContent('eduShell.delivery.phones');
  });

  it('Given wheel rush with its puzzle, Then the wheel shows', () => {
    render(<ProjectorRoundStage gameMode="wheel-rush" grid={GRID} wheelPuzzle={{ centerLetter: 'a', outerLetters: ['b', 'c'] } as never} t={t} />);
    expect(screen.getByTestId('projector-wheel')).toBeInTheDocument();
  });

  it('Given wheel rush before its puzzle arrives, Then the wall uses the camelCase key for the mode name, never a raw key path', () => {
    render(<ProjectorRoundStage gameMode="wheel-rush" grid={null} wheelPuzzle={null} t={t} />);
    expect(screen.getByTestId('projector-phone-mode')).toHaveTextContent('teacher.classroom.gameModes.wheelRush');
  });

  const blanks: [string, string | undefined, string[][] | null][] = [
    ...catalogueModes().map((m): [string, string, null] => [`${m.id} with no board yet`, m.launch.gameMode, null]),
    ['classic with an empty grid', 'classic', []],
    ['no mode at all', undefined, null],
    ['a mode the catalogue does not know', 'mystery-mode', null],
  ];

  it.each(blanks)('Given %s, Then the wall still shows something (never a blank stage)', (_label, mode, grid) => {
    const { container } = render(<ProjectorRoundStage gameMode={mode} grid={grid} wheelPuzzle={null} t={t} />);
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).not.toMatch(/undefined|mystery-mode/);
  });

  it('Given a mode without a bespoke board and live scores, Then the fallback shows the top three, highest first', () => {
    const players = [
      { username: 'Ana', score: 12 },
      { username: 'Ben', score: 40 },
      { username: 'Cy', score: 7 },
      { username: 'Dee', score: 25 },
    ];
    render(<ProjectorRoundStage gameMode="blast" grid={null} wheelPuzzle={null} players={players} t={t} />);
    const list = screen.getByTestId('projector-stage-leaders');
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Ben'), expect.stringContaining('Dee'), expect.stringContaining('Ana')]);
  });

  it('Given nobody has scored yet, Then the fallback hides the leaders list instead of ranking zeros', () => {
    render(<ProjectorRoundStage gameMode="blast" grid={null} wheelPuzzle={null} players={[{ username: 'Ana', score: 0 }]} t={t} />);
    expect(screen.queryByTestId('projector-stage-leaders')).toBeNull();
  });

  it('Given a score that just changed, Then that score pops with a transform-only animation that motion-reduce users skip', () => {
    const { rerender } = render(<ProjectorRoundStage gameMode="blast" grid={null} wheelPuzzle={null} players={[{ username: 'Ana', score: 5 }]} t={t} />);
    const before = screen.getByTestId('projector-stage-score-Ana');
    expect(before.className).toMatch(/motion-safe:animate-score-pop/);
    rerender(<ProjectorRoundStage gameMode="blast" grid={null} wheelPuzzle={null} players={[{ username: 'Ana', score: 9 }]} t={t} />);
    expect(screen.getByTestId('projector-stage-score-Ana')).not.toBe(before);
  });
});
