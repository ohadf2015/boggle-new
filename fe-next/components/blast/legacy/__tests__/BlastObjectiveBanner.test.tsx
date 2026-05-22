/**
 * BlastObjectiveBanner — persistent goal banner. Sits below HUD, never
 * dismissable, shows live progress for every secondary wave objective.
 *
 * Sprint 1 clarity guard: all 3 LLM critiques flagged the dismissable goal
 * surface as the #1 frustration source. Banner renders inline below HUD
 * with no close button, fades-but-keeps-visible on goal completion.
 *
 * TDD: written before implementation.
 */
import { render, screen } from '@testing-library/react';
import { BlastObjectiveBanner } from '../BlastObjectiveBanner';
import type { BlastObjectiveProgress } from '../types';

const t = (key: string) => {
  const map: Record<string, string> = {
    'blast.objective.scoreTarget': 'Score {target} points',
    'blast.objective.collectType': 'Collect {target} {tileType} tiles',
    'blast.objective.wordLength': 'Find {target} words with {minWordLength}+ letters',
    'blast.objective.clearPercent': 'Clear {target}% of the board',
    'blast.objective.bannerTitle': 'Goals',
  };
  return map[key];
};

function progress(
  type: BlastObjectiveProgress['objective']['type'],
  current: number,
  target: number,
  extras: Partial<BlastObjectiveProgress['objective']> = {},
): BlastObjectiveProgress {
  return {
    objective: { type, target, ...extras } as BlastObjectiveProgress['objective'],
    current,
    isComplete: current >= target,
  };
}

describe('BlastObjectiveBanner', () => {
  it('renders one row per objective with label and progress', () => {
    render(
      <BlastObjectiveBanner
        objectives={[
          progress('score_target', 80, 200),
          progress('word_length', 1, 3, { minWordLength: 5 }),
        ]}
        t={t}
      />,
    );
    expect(screen.getByText('Score 200 points')).toBeInTheDocument();
    expect(screen.getByText('Find 3 words with 5+ letters')).toBeInTheDocument();
    expect(screen.getByText('80 / 200')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('omits clear_percent (already shown in HUD progress bar)', () => {
    render(
      <BlastObjectiveBanner
        objectives={[
          progress('clear_percent', 50, 90),
          progress('score_target', 100, 200),
        ]}
        t={t}
      />,
    );
    expect(screen.queryByText(/Clear 90% of the board/)).not.toBeInTheDocument();
    expect(screen.getByText('Score 200 points')).toBeInTheDocument();
  });

  it('marks complete objectives with data-complete=true', () => {
    render(
      <BlastObjectiveBanner
        objectives={[progress('score_target', 250, 200)]}
        t={t}
      />,
    );
    const row = screen.getByTestId('blast-objective-row-0');
    expect(row).toHaveAttribute('data-complete', 'true');
  });

  it('renders nothing when only clear_percent is present', () => {
    const { container } = render(
      <BlastObjectiveBanner
        objectives={[progress('clear_percent', 50, 90)]}
        t={t}
      />,
    );
    expect(container.querySelector('[data-testid="blast-objective-banner"]')).toBeNull();
  });

  it('marks objective label dir="auto" for mixed-locale target words (RTL safety)', () => {
    render(
      <BlastObjectiveBanner
        objectives={[progress('target_word', 0, 1, { targetWord: 'תורה' })]}
        t={t}
      />,
    );
    const row = screen.getByTestId('blast-objective-row-0');
    const label = row.querySelector('span[dir="auto"]');
    expect(label).not.toBeNull();
  });

  it('forces LTR direction on the progress fraction so RTL locales keep "current / target" order', () => {
    // In Hebrew (RTL) the bidi algorithm reorders "80 / 200" into "200 / 80"
    // unless the fraction span is explicitly isolated as dir="ltr".
    render(
      <BlastObjectiveBanner
        objectives={[
          progress('score_target', 80, 200),
          progress('color_power', 2, 4, { minColorCount: 4, colorTag: 'pink' }),
        ]}
        t={t}
      />,
    );
    expect(screen.getByText('80 / 200')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('2 / 4')).toHaveAttribute('dir', 'ltr');
  });

  it('has no dismiss button (persistent)', () => {
    render(
      <BlastObjectiveBanner
        objectives={[progress('score_target', 50, 200)]}
        t={t}
      />,
    );
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument();
  });
});
