/**
 * All four quick modes get a bounded flex-column stage so boards/wheels
 * don't crush into the HUD. Fill modes (classic/blast/hunt) use
 * overflow-hidden + items-stretch; wheel keeps a scrollable stage.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-word-wheel">wheel</div>,
}));
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-hunt">hunt</div>,
}));
vi.mock('../QuickClassicBoard', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-classic">classic</div>,
}));
vi.mock('../BlastQuickRound', () => ({
  BlastQuickRound: () => <div data-testid="mock-blast">blast</div>,
}));

const base = {
  seed: 's-layout',
  language: 'en',
  durationSec: 60,
  grid: [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ],
  totalWords: 10,
  perfectScore: 100,
} as const;

function assertBaseStage(el: HTMLElement) {
  expect(el.className).toMatch(/(^|\s)flex-1(\s|$)/);
  expect(el.className).toMatch(/flex-col/);
  expect(el.className).toMatch(/min-h-0/);
  expect(el.className).toMatch(/items-stretch/);
}

describe('QuickModeAdapter — playable stage for all modes', () => {
  it('wheel-rush stage is a scrollable flex column (daily-playing parity)', async () => {
    render(
      <QuickModeAdapter
        config={
          {
            mode: 'wheel-rush',
            ...base,
            words: ['cab'],
            wheel: {
              centerLetter: 'A',
              outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
              allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
              puzzleDate: '2026-07-08',
              language: 'en',
              puzzleNumber: 1,
            },
          } as QuickRoundConfig
        }
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    const stage = await screen.findByTestId('quick-stage-wheel-rush');
    assertBaseStage(stage);
    expect(stage.className).toMatch(/overflow-y-auto/);
  });

  it('classic stage is a locked fill column (no nested page scroll)', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'classic', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    const stage = await screen.findByTestId('quick-stage-classic');
    assertBaseStage(stage);
    expect(stage.className).toMatch(/overflow-hidden/);
    // Classic renders the MP board (QuickClassicBoard) which owns its own
    // h-full flex-1 wrapper internally; the stage just locks the fill column.
    await screen.findByTestId('mock-classic');
  });

  it('blast stage is a locked fill column with full-height wrap', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'blast', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    const stage = await screen.findByTestId('quick-stage-blast');
    assertBaseStage(stage);
    expect(stage.className).toMatch(/overflow-hidden/);
    const wrap = stage.firstElementChild as HTMLElement;
    expect(wrap.className).toMatch(/h-full/);
    expect(wrap.className).toMatch(/w-full/);
  });

  it('word-hunt stage is a locked fill column (survival owns scroll)', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'word-hunt', ...base, targetWord: 'TEST' } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    const stage = await screen.findByTestId('quick-stage-word-hunt');
    assertBaseStage(stage);
    expect(stage.className).toMatch(/overflow-hidden/);
    // No double STAGE pad/scroll — hunt owns that
    expect(stage.className).not.toMatch(/overflow-y-auto/);
  });
});
