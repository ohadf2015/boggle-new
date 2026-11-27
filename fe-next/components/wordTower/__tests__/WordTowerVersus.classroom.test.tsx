import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('../WordTowerScene', () => ({ WordTowerScene: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', language: 'en' }),
}));

const you = { tray: ['C', 'A', 'T', 'S', 'X', 'Y'], anchorLetter: 'C', scramblesLeft: 2, heightM: 40, combo: 0, floors: 2, bombCharge: 99 };
const standings = [
  { rank: 1, playerId: 'Me', username: 'Me', heightM: 40, floors: 2, biome: 'meadow', banked: 1 },
  { rank: 2, playerId: 'Bo', username: 'Bo', heightM: 2, floors: 1, biome: 'meadow', banked: 0 },
];
const tower = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('@/lib/wordTower/useWordTowerVersus', () => ({
  useWordTowerVersus: () => ({
    state: tower.state, word: 'CA',
    selectTile: vi.fn(), backspace: vi.fn(), clear: vi.fn(), submit: vi.fn(), scramble: vi.fn(), sendBomb: vi.fn(),
  }),
}));

import { WordTowerVersus } from '../WordTowerVersus';

const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|border-neo-cream|ring-offset-neo-navy|backdrop-blur/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');

function mount(classroom: boolean, waiting: boolean) {
  tower.state = { you: waiting ? null : you, standings, endsAtMs: 0, selected: [0], lastError: waiting ? null : 'tooShort', errorKey: 1, lastBombHit: null, bombKey: 0, resultKey: 0 };
  const { container } = render(
    <ClassroomBoardProvider value={classroom}>
      <WordTowerVersus socket={null} username="Me" remainingTime={75} onQuit={vi.fn()} />
    </ClassroomBoardProvider>,
  );
  return container.firstElementChild!;
}

describe('WordTowerVersus classroom skin', () => {
  it.each([true, false])('arcade (waiting %s): the main game keeps its exact classes', (waiting) => {
    expect(classesOf(mount(false, waiting))).toMatchSnapshot();
  });

  it.each([true, false])('classroom (waiting %s): sky page, cream HUD, no navy, white ink or blur', (waiting) => {
    const root = mount(true, waiting);
    expect(root.className).toContain('bg-edu-page');
    // White ink on the purple scramble button and the red flash keeps the contract's solid-fill exception.
    expect(classesOf(root).filter((c) => DARK.test(c) && !/bg-neo-(purple|red)\b/.test(c))).toEqual([]);
  });
});
