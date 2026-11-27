import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';
import { BlastHUD } from '../BlastHUD';
import { BlastHudClearMeter } from '../hud/BlastHudClearMeter';

const props = {
  score: 120,
  wordsFoundCount: 4,
  movesRemaining: Infinity,
  totalMoves: Infinity,
  waveNumber: 1,
  tilesCleared: 12,
  totalTiles: 36,
  onQuit: () => {},
  isMultiplayer: true,
  remainingTime: 43,
  totalTime: 60,
  isDesktopCanvas: true,
  t: (k: string) => k,
} as never;

const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-lime(\s|$)|border-white/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');
// The utility strip (help, quit) is hidden by the MP round frame; the hero row and meter are what a student sees.
const heroOf = () => screen.getByTestId('blast-hud').children[1];

describe('BlastHUD classroom skin', () => {
  it('arcade: the MP hero row and clear meter keep their exact classes', () => {
    render(<BlastHUD {...(props as object)} />);
    expect(classesOf(screen.getByTestId('blast-hud')).slice(0, 1)).toMatchSnapshot();
    expect(classesOf(heroOf())).toMatchSnapshot();
  });

  it('arcade: a met goal on the clear meter keeps its lime count', () => {
    const { container } = render(<BlastHudClearMeter tilesCleared={36} totalTiles={36} goalMet clearedLabel="cleared" layout="strip" />);
    expect(classesOf(container.firstElementChild!)).toMatchSnapshot();
  });

  it('classroom: the hero row sits on cream with page ink', () => {
    render(<ClassroomBoardProvider value><BlastHUD {...(props as object)} /></ClassroomBoardProvider>);
    expect(screen.getByTestId('blast-hud').className).toContain('bg-edu-surface');
    expect(classesOf(heroOf()).filter((c) => DARK.test(c))).toEqual([]);
  });

  it('classroom: the clear meter uses dark lime and page ink', () => {
    const { container } = render(<ClassroomBoardProvider value><BlastHudClearMeter tilesCleared={36} totalTiles={36} goalMet clearedLabel="cleared" layout="strip" /></ClassroomBoardProvider>);
    expect(classesOf(container.firstElementChild!).filter((c) => DARK.test(c))).toEqual([]);
  });
});
