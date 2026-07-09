/**
 * All four quick modes get a bounded flex-column stage so boards/wheels
 * don't crush into the HUD (parity with the wheel-rush fix).
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-word-wheel">wheel</div>,
}));
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-hunt">hunt</div>,
}));
vi.mock('@/components/singleplayer/SinglePlayerGame', () => ({
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

function assertStage(el: HTMLElement) {
  expect(el.className).toMatch(/(^|\s)flex-1(\s|$)/);
  expect(el.className).toMatch(/flex-col/);
  expect(el.className).toMatch(/min-h-0/);
  expect(el.className).toMatch(/overflow-y-auto/);
}

describe('QuickModeAdapter — playable stage for all modes', () => {
  it('wheel-rush stage is a non-collapsing flex column', async () => {
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
    assertStage(stage);
  });

  it('classic stage is a non-collapsing flex column', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'classic', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    assertStage(await screen.findByTestId('quick-stage-classic'));
  });

  it('blast stage is a non-collapsing flex column', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'blast', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    assertStage(await screen.findByTestId('quick-stage-blast'));
  });

  it('word-hunt stage is a non-collapsing flex column', async () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'word-hunt', ...base, targetWord: 'TEST' } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    assertStage(await screen.findByTestId('quick-stage-word-hunt'));
  });
});
