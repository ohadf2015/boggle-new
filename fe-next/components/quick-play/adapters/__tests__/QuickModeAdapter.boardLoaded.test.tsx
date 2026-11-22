/**
 * The funnel's only "board appeared" signal was `singleplayer_grid_ready`,
 * which the engine fires — so wheel-rush, word-hunt and blast could never emit
 * it and their rounds looked like drop-off. Every mode needs one event that
 * fires when a board actually mounts, emitted from the adapter all four share.
 *
 * Written BEFORE implementation (RED phase).
 */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import posthog from '@/lib/analytics/lazyPosthog';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => () => undefined,
}));

vi.mock('../QuickClassicBoard', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-classic" />,
}));
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-hunt" />,
}));
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-wheel" />,
}));
vi.mock('../BlastQuickRound', () => ({
  BlastQuickRound: () => <div data-testid="mock-blast" />,
}));

const base = {
  seed: 's-loaded',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  wheel: { centerLetter: 'A', outerLetters: [], allLetters: [] },
  words: ['aa'],
  totalWords: 4,
  perfectScore: 50,
} as const;

function loadedEvents() {
  return vi.mocked(posthog.capture).mock.calls.filter(([e]) => e === 'quick_play_board_loaded');
}

describe('QuickModeAdapter — board_loaded fires for every mode', () => {
  beforeEach(() => vi.mocked(posthog.capture).mockClear());

  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush'] as const)(
    'reports a mounted %s board exactly once',
    (mode) => {
      render(
        <QuickModeAdapter
          config={{ mode, ...base } as QuickRoundConfig}
          onDone={vi.fn()}
          onQuit={vi.fn()}
          selectedAt={Date.now() - 120}
        />,
      );
      expect(loadedEvents()).toHaveLength(1);
      const props = loadedEvents()[0][1] as Record<string, unknown>;
      expect(props.mode).toBe(mode);
      expect(props.ms as number).toBeGreaterThanOrEqual(120);
    },
  );

  it('does not re-report the same board on a re-render', () => {
    const config = { mode: 'classic', ...base } as QuickRoundConfig;
    const { rerender } = render(
      <QuickModeAdapter config={config} onDone={vi.fn()} onQuit={vi.fn()} selectedAt={Date.now()} />,
    );
    rerender(<QuickModeAdapter config={config} onDone={vi.fn()} onQuit={vi.fn()} selectedAt={Date.now()} />);
    expect(loadedEvents()).toHaveLength(1);
  });
});
