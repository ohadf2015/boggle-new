/**
 * Tests for BlastWaveIntro — archetype-themed mascot banner at wave start.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BlastWaveIntro } from '../BlastWaveIntro';

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: (props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => <div {...props} />,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'blast.archetypes.normal': 'STANDARD WAVE',
    'blast.archetypes.scoreRush': 'SCORE RUSH',
    'blast.archetypes.treasureHunt': 'TREASURE HUNT',
    'blast.archetypes.survival': 'SURVIVAL',
    'blast.archetypes.silence': 'SILENT WAVE',
    'blast.mascot.hyped': 'Hyped mascot',
    'blast.mascot.sneaky': 'Sneaky mascot',
    'blast.mascot.sweating': 'Sweating mascot',
    'blast.mascot.neutral': 'Neutral mascot',
    'blast.objective.scoreTarget': 'Score {target} pts',
    'blast.objective.clearPercent': 'Clear {target}% of the board',
    'blast.objective.bannerTitle': 'Goals',
    'blast.waveIntro.dragHint': 'Drag to connect letters into words',
    'blast.waveIntro.tapToStart': 'Tap to start',
  };
  return map[key];
};

const prog = (type: string, target: number, extras: Record<string, unknown> = {}) =>
  ({ objective: { type, target, ...extras }, current: 0, isComplete: false }) as unknown as import('../types').BlastObjectiveProgress;

describe('BlastWaveIntro', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  it('renders archetype mascot for scoreRush', () => {
    render(<BlastWaveIntro waveNumber={4} archetype="scoreRush" t={mockT} />);
    const img = screen.getByTestId('blast-wave-intro-mascot') as HTMLImageElement;
    expect(img.src).toContain('mascot-new-onfire');
    expect(img.getAttribute('data-mascot-key')).toBe('hyped');
  });

  it('renders archetype mascot for treasureHunt', () => {
    render(<BlastWaveIntro waveNumber={2} archetype="treasureHunt" t={mockT} />);
    const img = screen.getByTestId('blast-wave-intro-mascot') as HTMLImageElement;
    expect(img.src).toContain('mascot-new-explorer');
  });

  it('renders archetype mascot for survival', () => {
    render(<BlastWaveIntro waveNumber={6} archetype="survival" t={mockT} />);
    const img = screen.getByTestId('blast-wave-intro-mascot') as HTMLImageElement;
    expect(img.src).toContain('mascot-new-scared');
  });

  it('renders translated archetype label', () => {
    render(<BlastWaveIntro waveNumber={4} archetype="scoreRush" t={mockT} />);
    expect(screen.getByText('SCORE RUSH')).toBeInTheDocument();
  });

  it('auto-dismisses after 2600ms (no goals)', () => {
    const { container } = render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    expect(container.textContent).toContain('STANDARD WAVE');
    act(() => { jest.advanceTimersByTime(2700); });
    expect(container.textContent).toBe('');
  });

  it('stays visible longer when goals are previewed (4200ms total)', () => {
    const { container } = render(
      <BlastWaveIntro
        waveNumber={3}
        archetype="normal"
        t={mockT}
        objectives={[prog('score_target', 500), prog('clear_percent', 90)]}
      />,
    );
    // Still on screen after 2.7s (no-goal duration)
    act(() => { jest.advanceTimersByTime(2700); });
    expect(container.textContent).toContain('STANDARD WAVE');
    // But gone after 4.3s (with-goal duration)
    act(() => { jest.advanceTimersByTime(1600); });
    expect(container.textContent).toBe('');
  });

  it('re-triggers on waveNumber change', () => {
    const { container, rerender } = render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    act(() => { jest.advanceTimersByTime(2700); });
    expect(container.textContent).toBe('');
    rerender(<BlastWaveIntro waveNumber={2} archetype="treasureHunt" t={mockT} />);
    expect(container.textContent).toContain('TREASURE HUNT');
  });

  it('tap-to-dismiss works after guard period (500ms)', () => {
    const { container, getByTestId } = render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    const overlay = getByTestId('blast-wave-intro-overlay');
    expect(container.textContent).toContain('STANDARD WAVE');

    // Tap at 0ms (within guard window) — should not dismiss
    act(() => { overlay.click(); });
    expect(container.textContent).toContain('STANDARD WAVE');

    // Advance 600ms (now > 500ms guard threshold)
    act(() => { jest.advanceTimersByTime(600); });

    // Tap now should dismiss
    act(() => { overlay.click(); });
    expect(container.textContent).toBe('');
  });

  it('tap-to-start hint appears after 1s', () => {
    const { getByText, queryByText } = render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    // Hint should not be visible initially
    expect(queryByText('Tap to start')).toBeNull();
    // Advance to 1s (hint delay)
    act(() => { jest.advanceTimersByTime(1000); });
    // Now hint should be visible
    expect(getByText('Tap to start')).toBeInTheDocument();
  });

  it('wave 1 displays dragHint', () => {
    const { getByText } = render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    expect(getByText('Drag to connect letters into words')).toBeInTheDocument();
  });

  it('wave 2+ does not display dragHint', () => {
    const { queryByText } = render(<BlastWaveIntro waveNumber={2} archetype="normal" t={mockT} />);
    expect(queryByText('Drag to connect letters into words')).toBeNull();
  });

  it('previews the wave goals (excluding clear_percent, shown in HUD)', () => {
    render(
      <BlastWaveIntro
        waveNumber={2}
        archetype="normal"
        t={mockT}
        objectives={[prog('clear_percent', 90), prog('score_target', 60)]}
      />,
    );
    const preview = screen.getByTestId('blast-wave-intro-goals');
    expect(preview.textContent).toContain('Score 60 pts');
    expect(preview.textContent).not.toContain('Clear 90%');
  });

  it('renders no goal preview when objectives are omitted', () => {
    render(<BlastWaveIntro waveNumber={1} archetype="normal" t={mockT} />);
    expect(screen.queryByTestId('blast-wave-intro-goals')).toBeNull();
  });

  it('renders no goal preview when only clear_percent is present', () => {
    render(
      <BlastWaveIntro
        waveNumber={1}
        archetype="normal"
        t={mockT}
        objectives={[prog('clear_percent', 90)]}
      />,
    );
    expect(screen.queryByTestId('blast-wave-intro-goals')).toBeNull();
  });
});
