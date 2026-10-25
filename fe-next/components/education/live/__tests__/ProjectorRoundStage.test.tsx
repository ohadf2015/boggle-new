import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectorRoundStage } from '../ProjectorRoundStage';

const t = (key: string) => key;
const GRID = [['a', 'b'], ['c', 'd']];

describe('ProjectorRoundStage', () => {
  it.each(['classic', 'word-hunt'])('Given %s, where every phone plays the same board, Then the wall shows that board', (mode) => {
    render(<ProjectorRoundStage gameMode={mode} grid={GRID} wheelPuzzle={null} t={t} />);
    expect(screen.getByTestId('projector-board')).toBeInTheDocument();
  });

  it.each(['blast', 'wordcraft'])('Given %s, where each phone has its own board, Then the wall shows an explicit phones-mode view instead of a stale board', (mode) => {
    render(<ProjectorRoundStage gameMode={mode} grid={GRID} wheelPuzzle={null} t={t} />);
    expect(screen.queryByTestId('projector-board')).toBeNull();
    const card = screen.getByTestId('projector-phone-mode');
    expect(card).toHaveTextContent(`teacher.classroom.gameModes.${mode}`);
    expect(card).toHaveTextContent(`education.modePicker.how.${mode}`);
    expect(card).toHaveTextContent('eduShell.delivery.phones');
  });

  it('Given wheel rush with its puzzle, Then the wheel shows', () => {
    render(<ProjectorRoundStage gameMode="wheel-rush" grid={GRID} wheelPuzzle={{ centerLetter: 'a', outerLetters: ['b', 'c'] } as never} t={t} />);
    expect(screen.getByTestId('projector-wheel')).toBeInTheDocument();
  });

  it('Given the quiz (no board), Then the stage stays empty', () => {
    const { container } = render(<ProjectorRoundStage gameMode="vocab-quiz" grid={null} wheelPuzzle={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
