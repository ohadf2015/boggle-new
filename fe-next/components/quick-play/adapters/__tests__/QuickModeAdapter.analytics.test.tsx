/**
 * The quick-play funnel jumps straight from mode_selected to round_completed,
 * so a board that never appeared is indistinguishable from a player who quit.
 * This event is the midpoint: it fires from INSIDE the hub's error boundary,
 * so a mode whose dynamic chunk crashes is missing from it (the boundary keeps
 * the hub mounted, so a hub-level effect would fire either way and prove
 * nothing).
 */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => vi.fn(),
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

import posthog from '@/lib/analytics/lazyPosthog';

const base = {
  seed: 's-analytics',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 4,
  perfectScore: 50,
} as const;

describe('QuickModeAdapter — board render instrumentation', () => {
  beforeEach(() => vi.mocked(posthog.capture).mockClear());

  it('reports the board reaching the screen, with the mode that has to render', () => {
    render(
      <QuickModeAdapter
        config={{ mode: 'blast', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('quick_play_board_render_started', {
      mode: 'blast',
      seed: 's-analytics',
    });
  });

  it('reports once per round, not again when the parent re-renders', () => {
    const { rerender } = render(
      <QuickModeAdapter
        config={{ mode: 'wheel-rush', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    rerender(
      <QuickModeAdapter
        config={{ mode: 'wheel-rush', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    const renderStarts = vi
      .mocked(posthog.capture)
      .mock.calls.filter((c) => c[0] === 'quick_play_board_render_started');
    expect(renderStarts).toHaveLength(1);
  });
});
