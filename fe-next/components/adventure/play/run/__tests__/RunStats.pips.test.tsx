/**
 * The recap counts NODES walked, not the world's old level list: a run is one
 * act map (MAP_ROWS deep), and the two numbers differ — a completed world used
 * to read "8/7".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import { LEVELS_PER_WORLD } from '@/lib/adventure/play/levels';
import RunStats from '../RunStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../RelicBar', () => ({ default: () => null }));

const summary = { levelsCleared: MAP_ROWS, relics: [], gold: 143, bestWord: { word: 'aegises', pts: 200 } };

describe('RunStats pips', () => {
  it('given a fully walked act map, when the recap renders, then the count is out of the map depth', () => {
    expect(MAP_ROWS).not.toBe(LEVELS_PER_WORLD); // the whole point of the fix
    render(<RunStats summary={summary} fell={false} />);
    expect(screen.getByText(`${MAP_ROWS}/${MAP_ROWS}`)).toBeInTheDocument();
  });

  it('given a run cut short, when the recap renders, then it still counts against the map depth', () => {
    render(<RunStats summary={{ ...summary, levelsCleared: 3 }} fell />);
    expect(screen.getByText(`3/${MAP_ROWS}`)).toBeInTheDocument();
  });
});
