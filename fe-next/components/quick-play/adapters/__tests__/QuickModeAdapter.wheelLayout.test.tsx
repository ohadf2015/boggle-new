import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

// Mock the (dynamically imported) Word Wheel so we can assert the wrapper the
// adapter mounts it into, not the wheel's internals.
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-word-wheel">wheel</div>,
}));

const wheelConfig: QuickRoundConfig = {
  mode: 'wheel-rush',
  seed: 's-1',
  language: 'en',
  durationSec: 90,
  grid: [],
  wheel: {
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    puzzleDate: '2026-07-08',
    language: 'en',
    puzzleNumber: 1,
  },
  words: ['bad', 'cab'],
  totalWords: 10,
  perfectScore: 100,
};

describe('QuickModeAdapter — Word Wheel layout', () => {
  it('mounts the Word Wheel inside a bounded flex-column stage so the wheel cluster cannot collapse into the top HUD', async () => {
    render(<QuickModeAdapter config={wheelConfig} onDone={vi.fn()} onQuit={vi.fn()} />);

    const wheel = await screen.findByTestId('mock-word-wheel');
    const stage = wheel.parentElement as HTMLElement;

    // Root cause of the RTL Quick Game crush: WordWheelGame's mobile root is
    // `flex-1` and its wheel cluster uses `[container-type:size]` — both need a
    // definite-height flex-column ancestor. Rendered bare (as before) the
    // container-query block-size collapses to ~0 and the board flies up into the
    // timer/HUD. The stage must re-establish the same bounded flex column the
    // Daily Challenge playing wrapper provides.
    expect(stage.className).toMatch(/(^|\s)flex-1(\s|$)/);
    expect(stage.className).toMatch(/flex-col/);
    expect(stage.className).toMatch(/min-h-0/);
    expect(stage.className).toMatch(/overflow-y-auto/);
  });
});
